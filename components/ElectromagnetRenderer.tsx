'use client';

import React, { useState, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
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

interface GameEvent {
  type: 'prediction' | 'observation' | 'interaction' | 'completion';
  phase: Phase;
  data: Record<string, unknown>;
}

interface ElectromagnetRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

interface GameState {
  phase: Phase;
  prediction: string | null;
  twistPrediction: string | null;
  testAnswers: number[];
  completedApps: number[];
  current: number;
  coilTurns: number;
  hasCore: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const PHASES: Phase[] = [
  'hook', 'predict', 'play', 'review',
  'twist_predict', 'twist_play', 'twist_review',
  'transfer', 'test', 'mastery'
];

const TEST_QUESTIONS = [
  {
    question: 'What creates the magnetic field in an electromagnet?',
    options: [
      { text: 'The iron core', correct: false },
      { text: 'Electric current flowing through wire', correct: true },
      { text: 'Static electricity', correct: false },
      { text: 'The battery\'s chemicals', correct: false }
    ]
  },
  {
    question: 'Why does adding an iron core strengthen an electromagnet?',
    options: [
      { text: 'Iron is heavier', correct: false },
      { text: 'Iron conducts electricity better', correct: false },
      { text: 'Iron concentrates and amplifies the magnetic field', correct: true },
      { text: 'Iron generates its own magnetic field', correct: false }
    ]
  },
  {
    question: 'What happens to an electromagnet\'s field when you reverse the current?',
    options: [
      { text: 'The field disappears', correct: false },
      { text: 'The field doubles in strength', correct: false },
      { text: 'The field stays the same', correct: false },
      { text: 'The north and south poles swap', correct: true }
    ]
  },
  {
    question: 'How can you make an electromagnet stronger?',
    options: [
      { text: 'Use thinner wire', correct: false },
      { text: 'Increase current and/or number of coil turns', correct: true },
      { text: 'Use plastic instead of iron', correct: false },
      { text: 'Decrease the voltage', correct: false }
    ]
  },
  {
    question: 'What is the main advantage of an electromagnet over a permanent magnet?',
    options: [
      { text: 'Electromagnets are always stronger', correct: false },
      { text: 'Electromagnets can be turned on and off', correct: true },
      { text: 'Electromagnets never need maintenance', correct: false },
      { text: 'Electromagnets are cheaper to make', correct: false }
    ]
  },
  {
    question: 'In an MRI machine, what allows the electromagnet to be extremely powerful?',
    options: [
      { text: 'Using very thick copper wire', correct: false },
      { text: 'Superconducting coils that carry current without resistance', correct: true },
      { text: 'Adding multiple iron cores', correct: false },
      { text: 'Using alternating current at high frequency', correct: false }
    ]
  },
  {
    question: 'How does a junkyard crane electromagnet release a car?',
    options: [
      { text: 'By reversing the current direction', correct: false },
      { text: 'By turning off the current', correct: true },
      { text: 'By lowering the voltage slowly', correct: false },
      { text: 'By heating up the electromagnet', correct: false }
    ]
  },
  {
    question: 'What happens to the magnetic field if you double both the current and the number of coil turns?',
    options: [
      { text: 'The field strength doubles', correct: false },
      { text: 'The field strength quadruples', correct: true },
      { text: 'The field strength stays the same', correct: false },
      { text: 'The field strength is cut in half', correct: false }
    ]
  },
  {
    question: 'Why do electric motors use electromagnets instead of permanent magnets for the stator?',
    options: [
      { text: 'Permanent magnets are too expensive', correct: false },
      { text: 'Electromagnets allow the field direction to be switched for continuous rotation', correct: true },
      { text: 'Permanent magnets would melt from the heat', correct: false },
      { text: 'Electromagnets are lighter in weight', correct: false }
    ]
  },
  {
    question: 'What is the right-hand rule used for in electromagnetism?',
    options: [
      { text: 'To measure the strength of the magnetic field', correct: false },
      { text: 'To determine the direction of the magnetic field around a current-carrying wire', correct: true },
      { text: 'To calculate the voltage needed', correct: false },
      { text: 'To find the temperature of the wire', correct: false }
    ]
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO-BASED TEST QUESTIONS
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    // Question 1: Core concept - how electromagnets work (Easy)
    scenario: "A student wraps copper wire around a nail and connects it to a battery. When the circuit is complete, the nail picks up paper clips.",
    question: "What causes the nail to become magnetic when current flows through the wire?",
    options: [
      { id: 'a', label: "The battery transfers its magnetic energy to the nail", correct: false },
      { id: 'b', label: "The electric current flowing through the wire creates a magnetic field around it", correct: true },
      { id: 'c', label: "The copper wire is naturally magnetic when heated by electricity", correct: false },
      { id: 'd', label: "The nail absorbs static electricity from the wire insulation", correct: false }
    ],
    explanation: "When electric current flows through a wire, it creates a circular magnetic field around the wire. Coiling the wire concentrates this field, and the iron nail amplifies it by aligning its magnetic domains with the field. This is the fundamental principle discovered by Hans Christian Oersted in 1820."
  },
  {
    // Question 2: Electromagnet vs permanent magnet (Easy-Medium)
    scenario: "A junkyard uses a crane with a large electromagnet to sort metal scraps. The operator needs to pick up a car, move it to a pile, and release it.",
    question: "What is the main advantage of using an electromagnet instead of a permanent magnet for this task?",
    options: [
      { id: 'a', label: "Electromagnets are always stronger than permanent magnets", correct: false },
      { id: 'b', label: "Electromagnets can be turned on to grab objects and off to release them", correct: true },
      { id: 'c', label: "Electromagnets are lighter and easier to mount on cranes", correct: false },
      { id: 'd', label: "Permanent magnets would rust when exposed to metal scraps", correct: false }
    ],
    explanation: "The key advantage of electromagnets is controllability. By switching the current on or off, operators can grab metal objects (current on, magnetic field present) and release them precisely where needed (current off, magnetic field disappears). A permanent magnet would require mechanical force to separate it from the metal."
  },
  {
    // Question 3: Factors affecting electromagnet strength (Medium)
    scenario: "An engineer is designing an electromagnet for a recycling facility. The initial design uses 50 turns of wire carrying 2 amperes of current, but needs to be twice as strong.",
    question: "Which modification would double the electromagnet's field strength?",
    options: [
      { id: 'a', label: "Use wire with twice the diameter", correct: false },
      { id: 'b', label: "Double the current to 4 amperes OR double the turns to 100", correct: true },
      { id: 'c', label: "Add a plastic core inside the coil", correct: false },
      { id: 'd', label: "Paint the wire with magnetic paint", correct: false }
    ],
    explanation: "The magnetic field strength of a solenoid is proportional to both the current (I) and the number of turns (n): B = u0 * n * I. Doubling either the current or the number of turns will double the field strength. Wire diameter affects resistance but not the field directly, and plastic is not ferromagnetic so it won't amplify the field."
  },
  {
    // Question 4: Electric motor operation (Medium)
    scenario: "A toy car's DC motor suddenly stops working. When you open it, you see that the metal brushes that contact the spinning commutator are completely worn away.",
    question: "Why are brushes and a commutator necessary in a DC motor?",
    options: [
      { id: 'a', label: "They cool down the motor by conducting heat away from the coils", correct: false },
      { id: 'b', label: "They reverse the current direction in the rotor coils at the right moment to maintain rotation", correct: true },
      { id: 'c', label: "They provide lubrication between the rotor and stator", correct: false },
      { id: 'd', label: "They amplify the voltage from the battery to increase speed", correct: false }
    ],
    explanation: "In a DC motor, the rotor would simply align with the magnetic field and stop if the current direction stayed constant. The commutator and brushes mechanically reverse the current direction in the rotor coils every half rotation, ensuring the rotor continuously chases the magnetic field and keeps spinning."
  },
  {
    // Question 5: MRI machine magnets (Medium-Hard)
    scenario: "An MRI technician explains that the hospital's MRI machine contains an electromagnet producing a field of 3 Tesla - about 60,000 times stronger than Earth's magnetic field - yet doesn't require enormous amounts of electricity.",
    question: "What technology allows MRI machines to achieve such powerful magnetic fields efficiently?",
    options: [
      { id: 'a', label: "Superconducting coils cooled to near absolute zero, eliminating electrical resistance", correct: true },
      { id: 'b', label: "Rare earth permanent magnets that don't need electricity at all", correct: false },
      { id: 'c', label: "Pulsed electromagnets that only activate during scans", correct: false },
      { id: 'd', label: "Multiple small electromagnets arranged in a special pattern", correct: false }
    ],
    explanation: "MRI machines use superconducting electromagnets cooled with liquid helium to around 4 Kelvin (-269 C). At these temperatures, the wire has zero electrical resistance, so once current is established, it flows indefinitely without power loss. This allows extremely high currents and powerful fields without continuous energy consumption or heat generation."
  },
  {
    // Question 6: Magnetic field direction (right-hand rule) (Hard)
    scenario: "A physicist holds a current-carrying wire pointing upward. Using the right-hand rule, she points her thumb in the direction of conventional current flow (upward).",
    question: "In which direction do her curled fingers indicate the magnetic field circulates?",
    options: [
      { id: 'a', label: "The field lines point straight up, parallel to the current", correct: false },
      { id: 'b', label: "The field circulates counterclockwise when viewed from above (fingers curl from front to left to back to right)", correct: true },
      { id: 'c', label: "The field points straight down, opposite to the current", correct: false },
      { id: 'd', label: "The field radiates outward in all directions like light from a bulb", correct: false }
    ],
    explanation: "The right-hand rule states: point your thumb in the direction of conventional current, and your curled fingers show the direction of the magnetic field lines. These field lines form concentric circles around the wire, circulating counterclockwise when viewed from the direction the current is flowing. This circular field pattern is why coiling wire into a solenoid concentrates the magnetic field."
  },
  {
    // Question 7: Solenoid design considerations (Hard)
    scenario: "An automotive engineer is designing a solenoid actuator for a fuel injector that must respond extremely quickly (within milliseconds) when the engine computer signals it to open.",
    question: "Why might the engineer choose fewer coil turns with higher current rather than more turns with lower current?",
    options: [
      { id: 'a', label: "Fewer turns make the solenoid physically smaller, which is the only consideration", correct: false },
      { id: 'b', label: "More turns create higher inductance, which slows the rate at which current (and thus the magnetic field) can change", correct: true },
      { id: 'c', label: "The magnetic field only forms at the ends of the coil, so fewer turns is always better", correct: false },
      { id: 'd', label: "Higher current produces a different type of magnetism that acts faster", correct: false }
    ],
    explanation: "Inductance (L) is proportional to the square of the number of turns (L proportional to n^2). Higher inductance opposes changes in current, slowing the time for the magnetic field to build up or collapse. For fast-acting applications like fuel injectors, using fewer turns with higher current reduces inductance and allows rapid response times, even though it may require more robust power electronics."
  },
  {
    // Question 8: Magnetic saturation (Hard)
    scenario: "A student keeps increasing the current through an electromagnet with an iron core. Initially, doubling the current doubles the magnetic field strength, but at very high currents, the field increases much more slowly.",
    question: "What phenomenon explains why the magnetic field stops increasing proportionally at high currents?",
    options: [
      { id: 'a', label: "The wire insulation begins to melt, creating resistance", correct: false },
      { id: 'b', label: "The iron core reaches magnetic saturation - nearly all its magnetic domains are already aligned", correct: true },
      { id: 'c', label: "The magnetic field lines start canceling each other out", correct: false },
      { id: 'd', label: "The battery voltage drops due to the high current draw", correct: false }
    ],
    explanation: "Magnetic saturation occurs when nearly all the magnetic domains in a ferromagnetic material (like iron) have aligned with the external field. Once saturated, there are no more domains left to align, so further increases in current only add the small field from the coil itself, not the massive amplification from the core. Most iron cores saturate around 1.5-2.0 Tesla."
  },
  {
    // Question 9: Superconducting electromagnets (Hard)
    scenario: "The Large Hadron Collider at CERN uses superconducting electromagnets cooled to 1.9 Kelvin (colder than outer space) to bend particle beams traveling near the speed of light around a 27-kilometer ring.",
    question: "Why must these magnets use superconductors rather than conventional copper wire?",
    options: [
      { id: 'a', label: "Copper cannot be formed into coils large enough for the accelerator", correct: false },
      { id: 'b', label: "Superconductors can carry the enormous currents needed without energy loss or heat generation that would melt copper", correct: true },
      { id: 'c', label: "Superconductors are magnetic, while copper is not", correct: false },
      { id: 'd', label: "The cold temperature is needed to slow down the particles, and superconductors provide it", correct: false }
    ],
    explanation: "Bending particles at near-light speeds requires magnetic fields of 8+ Tesla, which demands currents of over 11,000 amperes. In normal copper wire, this would generate enormous heat (P = I^2 * R), making the magnets impossible to cool. Superconductors have zero resistance, allowing these massive currents to flow without any energy loss, making the LHC technically and economically feasible."
  },
  {
    // Question 10: Electromagnetic relay operation (Hard)
    scenario: "A home automation system uses a small electromagnetic relay to control a 240V air conditioning unit. The relay coil operates on just 5V from a microcontroller, yet can safely switch the high-voltage AC power.",
    question: "How does the relay allow a low-voltage control signal to switch high-voltage power safely?",
    options: [
      { id: 'a', label: "The relay amplifies the 5V signal to 240V before passing it through", correct: false },
      { id: 'b', label: "The relay coil is connected directly to the 240V circuit, converting it to 5V", correct: false },
      { id: 'c', label: "The electromagnetic coil mechanically moves a switch contact, keeping the control and power circuits electrically isolated", correct: true },
      { id: 'd', label: "The relay stores energy from the 240V line and releases it in small 5V bursts", correct: false }
    ],
    explanation: "A relay provides galvanic isolation - the low-voltage control circuit and high-voltage power circuit are completely separate electrically. When 5V energizes the relay coil, it creates a magnetic field that physically pulls a metal armature, which mechanically closes (or opens) the contacts in the separate 240V circuit. This allows safe control of dangerous voltages from low-power electronics."
  }
];

const realWorldApps = [
  {
    icon: '🏥',
    title: 'MRI Medical Imaging',
    short: 'Superconducting electromagnets enable detailed body scans',
    tagline: 'See inside the human body without surgery',
    description: 'MRI machines use superconducting electromagnets cooled to near absolute zero to create magnetic fields 60,000 times stronger than Earth\'s, allowing doctors to visualize soft tissues, organs, and even brain activity in remarkable detail.',
    connection: 'The electromagnet principle you learned - current through coils creates magnetic fields - is scaled up massively using superconducting wire that has zero electrical resistance.',
    howItWorks: 'Liquid helium cools the coils to -269°C, enabling enormous currents to flow without resistance. These currents generate stable 1.5-7 Tesla fields that align hydrogen atoms in your body for imaging.',
    stats: [
      { value: '40,000+', label: 'MRI machines worldwide', icon: '🌍' },
      { value: '$8B', label: 'Annual MRI market', icon: '📈' },
      { value: '7 Tesla', label: 'Strongest clinical MRI', icon: '⚡' }
    ],
    examples: ['Brain tumor detection', 'Spinal cord imaging', 'Heart disease diagnosis', 'Sports injury assessment'],
    companies: ['Siemens Healthineers', 'GE Healthcare', 'Philips', 'Canon Medical'],
    futureImpact: 'High-field MRI at 10+ Tesla will reveal cellular-level details, while portable MRI units will bring scanning to rural areas.',
    color: '#3B82F6'
  },
  {
    icon: '🚄',
    title: 'Maglev Trains',
    short: 'Electromagnetic levitation for frictionless high-speed travel',
    tagline: 'Float at 600 km/h with no wheels touching rails',
    description: 'Maglev trains use electromagnets to both levitate the train above the track and propel it forward, eliminating wheel friction and enabling speeds over 600 km/h while being quieter and more energy-efficient than conventional trains.',
    connection: 'The controllable nature of electromagnets - turn on current to attract, off to release - enables precise levitation and propulsion control.',
    howItWorks: 'Superconducting magnets on the train interact with coils in the guideway. Alternating the current in track coils creates a traveling magnetic wave that pulls the train forward while simultaneously levitating it.',
    stats: [
      { value: '603 km/h', label: 'World speed record (Japan)', icon: '🏎️' },
      { value: '430 km/h', label: 'Shanghai commercial maglev', icon: '🚅' },
      { value: '10mm', label: 'Levitation gap', icon: '📏' }
    ],
    examples: ['Shanghai Maglev (China)', 'Chuo Shinkansen (Japan)', 'Incheon Airport Maglev', 'Changsha Maglev Express'],
    companies: ['Central Japan Railway', 'CRRC', 'Siemens', 'ThyssenKrupp'],
    futureImpact: 'Hyperloop-style vacuum tube maglev systems could achieve 1,000+ km/h, making travel between cities faster than flying.',
    color: '#8B5CF6'
  },
  {
    icon: '⚡',
    title: 'Electric Motors',
    short: 'Converting electricity to motion in everything from EVs to drones',
    tagline: 'The heartbeat of the electric revolution',
    description: 'Electric motors use electromagnets to create rotating magnetic fields that push against permanent magnets, converting electrical energy into mechanical motion with over 95% efficiency - powering everything from electric vehicles to industrial robots.',
    connection: 'AC current through stator coils creates a rotating magnetic field - exactly what you explored in the twist phase with alternating current.',
    howItWorks: 'In an induction motor, AC current in stationary coils (stator) creates a rotating magnetic field. This induces currents in the rotor, making it magnetic and causing it to spin, chasing the rotating field.',
    stats: [
      { value: '50%', label: 'Of global electricity powers motors', icon: '🔌' },
      { value: '95%+', label: 'Peak motor efficiency', icon: '♻️' },
      { value: '$150B', label: 'Electric motor market', icon: '💰' }
    ],
    examples: ['Tesla Model S motor (670 hp)', 'Industrial pumps and fans', 'Drone propulsion', 'Refrigerator compressors'],
    companies: ['Tesla', 'Nidec', 'ABB', 'Siemens'],
    futureImpact: 'Solid-state motors with no rare earth magnets will make EVs cheaper, while direct-drive motors will revolutionize wind turbines and aviation.',
    color: '#22C55E'
  },
  {
    icon: '🏗️',
    title: 'Scrapyard Electromagnets',
    short: 'Lifting tons of metal with the flip of a switch',
    tagline: 'Pick up a car, drop it on command',
    description: 'Industrial electromagnets in scrapyards and steel mills can lift entire cars and tons of metal debris. Unlike permanent magnets, they can release their load instantly by cutting the current - the ultimate demonstration of controllable magnetism.',
    connection: 'This is the most direct application of what you learned: high current + many coil turns + iron core = incredibly powerful, switchable magnet.',
    howItWorks: 'A large iron core wrapped with thick copper coils carries hundreds of amperes. The iron amplifies the field 1000×, creating enough magnetic force to lift vehicles. Cutting power releases the load.',
    stats: [
      { value: '20,000 kg', label: 'Maximum lift capacity', icon: '🏋️' },
      { value: '4 Tesla', label: 'Field strength achieved', icon: '🧲' },
      { value: '500 A', label: 'Typical operating current', icon: '⚡' }
    ],
    examples: ['Auto recycling facilities', 'Steel mills', 'Shipping container yards', 'Metal sorting plants'],
    companies: ['Eriez', 'Walker Magnetics', 'Ohio Magnetics', 'Bunting Magnetics'],
    futureImpact: 'AI-controlled electromagnets will automatically sort mixed metal waste, dramatically improving recycling efficiency and reducing landfill waste.',
    color: '#F59E0B'
  }
];

const TRANSFER_APPS = [
  {
    title: 'Electric Motors',
    description: 'Electromagnets create rotating magnetic fields that push permanent magnets, converting electricity to motion.',
    icon: '⚡'
  },
  {
    title: 'MRI Machines',
    description: 'Superconducting electromagnets create fields 60,000× Earth\'s, allowing detailed body imaging.',
    icon: '🏥'
  },
  {
    title: 'Scrapyard Cranes',
    description: 'Giant electromagnets lift cars and metal debris. Turn off the current to drop the load!',
    icon: '🏗️'
  },
  {
    title: 'Maglev Trains',
    description: 'Electromagnets both levitate the train and propel it forward at 600+ km/h with no wheels!',
    icon: '🚄'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function isValidPhase(phase: string): phase is Phase {
  return PHASES.includes(phase as Phase);
}

function playSound(type: 'click' | 'success' | 'failure' | 'transition' | 'complete'): void {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const sounds: Record<string, { freq: number; type: OscillatorType; duration: number }> = {
      click: { freq: 600, type: 'sine', duration: 0.08 },
      success: { freq: 880, type: 'sine', duration: 0.15 },
      failure: { freq: 220, type: 'sine', duration: 0.25 },
      transition: { freq: 440, type: 'triangle', duration: 0.12 },
      complete: { freq: 660, type: 'sine', duration: 0.2 }
    };

    const sound = sounds[type];
    oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch {
    // Audio not available
  }
}

function calculateFieldStrength(current: number, turns: number, hasCore: boolean): number {
  // B ∝ μ * n * I (simplified)
  const coreMultiplier = hasCore ? 1000 : 1;
  return current * turns * coreMultiplier * 0.001; // Scale for display
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ElectromagnetRenderer({ phase: initialPhase, onPhaseComplete, onCorrectAnswer, onIncorrectAnswer }: ElectromagnetRendererProps) {
  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(initialPhase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<number[]>([]);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Simulation state
  const [current, setCurrent] = useState(0); // Amperes (-5 to 5)
  const [coilTurns, setCoilTurns] = useState(10);
  const [hasCore, setHasCore] = useState(false);
  const [paperClipPositions, setPaperClipPositions] = useState<{x: number; y: number; attracted: boolean}[]>([]);

  // Twist state - reversing current / AC
  const [twistCurrent, setTwistCurrent] = useState(3);
  const [isAC, setIsAC] = useState(false);
  const [acPhase, setAcPhase] = useState(0);

  // Animation time for current flow
  const [animTime, setAnimTime] = useState(0);

  const navigationLockRef = useRef(false);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const goToPhase = (newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    playSound('transition');
    setPhase(newPhase);
    if (onPhaseComplete) onPhaseComplete();

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  };

  const nextPhase = () => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex < PHASES.length - 1) {
      goToPhase(PHASES[currentIndex + 1]);
    }
  };

  // ─── Animation Effect ────────────────────────────────────────────────────────
  // Animation timer for current flow visualization
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimTime(t => (t + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Paper clip attraction animation
  useEffect(() => {
    const fieldStrength = calculateFieldStrength(Math.abs(current), coilTurns, hasCore);
    const attractionRadius = Math.min(100, fieldStrength * 10);

    setPaperClipPositions(prev => {
      if (prev.length === 0) {
        // Initialize paper clips
        return [
          { x: 50, y: 150, attracted: false },
          { x: 350, y: 150, attracted: false },
          { x: 100, y: 220, attracted: false },
          { x: 300, y: 220, attracted: false },
        ];
      }

      return prev.map(clip => {
        const centerX = 200;
        const centerY = 140;
        const dist = Math.sqrt(Math.pow(clip.x - centerX, 2) + Math.pow(clip.y - centerY, 2));

        if (fieldStrength > 0 && dist < attractionRadius + 50) {
          const angle = Math.atan2(centerY - clip.y, centerX - clip.x);
          const speed = fieldStrength * 0.5;
          const newX = clip.x + Math.cos(angle) * speed;
          const newY = clip.y + Math.sin(angle) * speed;
          const newDist = Math.sqrt(Math.pow(newX - centerX, 2) + Math.pow(newY - centerY, 2));

          return {
            x: newDist < 30 ? clip.x : newX,
            y: newDist < 30 ? clip.y : newY,
            attracted: newDist < 50
          };
        }
        return clip;
      });
    });
  }, [current, coilTurns, hasCore]);

  // AC oscillation
  useEffect(() => {
    if (!isAC) return;

    const interval = setInterval(() => {
      setAcPhase(p => (p + 0.1) % (Math.PI * 2));
    }, 50);

    return () => clearInterval(interval);
  }, [isAC]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setCurrent(0);
      setCoilTurns(10);
      setHasCore(false);
      setPaperClipPositions([
        { x: 50, y: 150, attracted: false },
        { x: 350, y: 150, attracted: false },
        { x: 100, y: 220, attracted: false },
        { x: 300, y: 220, attracted: false },
      ]);
    }
    if (phase === 'twist_play') {
      setTwistCurrent(3);
      setIsAC(false);
      setAcPhase(0);
    }
  }, [phase]);

  // ─── Render Helpers ──────────────────────────────────────────────────────────
  const renderProgressBar = () => (
    <div className="flex items-center gap-1 mb-6">
      {PHASES.map((p, i) => (
        <div
          key={p}
          className={`h-2 flex-1 rounded-full transition-all duration-300 ${
            i <= PHASES.indexOf(phase)
              ? 'bg-gradient-to-r from-purple-500 to-blue-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  // Premium SVG Defs for electromagnet visualization
  const renderSVGDefs = () => (
    <defs>
      {/* Premium copper coil gradient - metallic appearance */}
      <linearGradient id="emagCoilGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="20%" stopColor="#f59e0b" />
        <stop offset="40%" stopColor="#d97706" />
        <stop offset="60%" stopColor="#b45309" />
        <stop offset="80%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#fbbf24" />
      </linearGradient>

      {/* Coil highlight for 3D effect */}
      <linearGradient id="emagCoilHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.8" />
        <stop offset="30%" stopColor="#fcd34d" stopOpacity="0.4" />
        <stop offset="70%" stopColor="#92400e" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#78350f" stopOpacity="0.5" />
      </linearGradient>

      {/* Iron core gradient - brushed metal look */}
      <linearGradient id="emagCoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6b7280" />
        <stop offset="15%" stopColor="#9ca3af" />
        <stop offset="30%" stopColor="#6b7280" />
        <stop offset="50%" stopColor="#4b5563" />
        <stop offset="70%" stopColor="#6b7280" />
        <stop offset="85%" stopColor="#9ca3af" />
        <stop offset="100%" stopColor="#6b7280" />
      </linearGradient>

      {/* Core edge highlight */}
      <linearGradient id="emagCoreEdge" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#d1d5db" stopOpacity="0.6" />
        <stop offset="50%" stopColor="#6b7280" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#374151" stopOpacity="0.8" />
      </linearGradient>

      {/* Magnetic field gradient - blue for north-oriented field */}
      <linearGradient id="emagFieldGradBlue" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
        <stop offset="20%" stopColor="#60a5fa" stopOpacity="0.3" />
        <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.6" />
        <stop offset="80%" stopColor="#60a5fa" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
      </linearGradient>

      {/* Magnetic field gradient - red for south-oriented field */}
      <linearGradient id="emagFieldGradRed" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
        <stop offset="20%" stopColor="#f87171" stopOpacity="0.3" />
        <stop offset="50%" stopColor="#fca5a5" stopOpacity="0.6" />
        <stop offset="80%" stopColor="#f87171" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
      </linearGradient>

      {/* Radial field glow */}
      <radialGradient id="emagFieldGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
        <stop offset="40%" stopColor="#7c3aed" stopOpacity="0.2" />
        <stop offset="70%" stopColor="#6d28d9" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#5b21b6" stopOpacity="0" />
      </radialGradient>

      {/* Battery/power source gradient */}
      <linearGradient id="emagBatteryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#4b5563" />
        <stop offset="30%" stopColor="#374151" />
        <stop offset="70%" stopColor="#1f2937" />
        <stop offset="100%" stopColor="#111827" />
      </linearGradient>

      {/* Wire gradient - positive (red) */}
      <linearGradient id="emagWirePositive" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#dc2626" />
        <stop offset="30%" stopColor="#ef4444" />
        <stop offset="50%" stopColor="#f87171" />
        <stop offset="70%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#dc2626" />
      </linearGradient>

      {/* Wire gradient - negative (blue) */}
      <linearGradient id="emagWireNegative" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#1d4ed8" />
        <stop offset="30%" stopColor="#3b82f6" />
        <stop offset="50%" stopColor="#60a5fa" />
        <stop offset="70%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>

      {/* Neutral wire */}
      <linearGradient id="emagWireNeutral" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#4b5563" />
        <stop offset="50%" stopColor="#6b7280" />
        <stop offset="100%" stopColor="#4b5563" />
      </linearGradient>

      {/* Current flow particle glow */}
      <radialGradient id="emagCurrentGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
        <stop offset="40%" stopColor="#fde047" stopOpacity="0.8" />
        <stop offset="70%" stopColor="#facc15" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
      </radialGradient>

      {/* Pole indicator gradients */}
      <radialGradient id="emagNorthPole" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="50%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#b91c1c" />
      </radialGradient>

      <radialGradient id="emagSouthPole" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </radialGradient>

      {/* Paper clip metallic gradient */}
      <linearGradient id="emagClipMetal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e5e7eb" />
        <stop offset="30%" stopColor="#d1d5db" />
        <stop offset="50%" stopColor="#9ca3af" />
        <stop offset="70%" stopColor="#d1d5db" />
        <stop offset="100%" stopColor="#e5e7eb" />
      </linearGradient>

      {/* Attracted paper clip glow */}
      <linearGradient id="emagClipAttracted" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#86efac" />
        <stop offset="30%" stopColor="#4ade80" />
        <stop offset="50%" stopColor="#22c55e" />
        <stop offset="70%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#86efac" />
      </linearGradient>

      {/* Info panel gradient */}
      <linearGradient id="emagPanelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#1f2937" />
        <stop offset="50%" stopColor="#111827" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>

      {/* Lab background gradient */}
      <linearGradient id="emagLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#030712" />
        <stop offset="50%" stopColor="#0a0f1a" />
        <stop offset="100%" stopColor="#030712" />
      </linearGradient>

      {/* Glow filter for magnetic field */}
      <filter id="emagFieldBlur" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Glow filter for current flow */}
      <filter id="emagCurrentBlur" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Glow filter for pole indicators */}
      <filter id="emagPoleGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Inner glow for core */}
      <filter id="emagCoreInnerGlow">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>

      {/* Subtle grid pattern for lab */}
      <pattern id="emagLabGrid" width="25" height="25" patternUnits="userSpaceOnUse">
        <rect width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
      </pattern>
    </defs>
  );

  const renderElectromagnet = (curr: number, turns: number, core: boolean, clips: typeof paperClipPositions) => {
    const fieldStrength = calculateFieldStrength(Math.abs(curr), turns, core);
    const fieldRadius = Math.min(80, fieldStrength * 8);
    const polarity = curr > 0 ? 'N-S' : curr < 0 ? 'S-N' : 'OFF';
    const coilCount = Math.min(turns, 20);
    const coilEndX = 160 + coilCount * 4;

    return (
      <div className="space-y-3">
        <svg viewBox="0 0 400 280" className="w-full h-56">
          {renderSVGDefs()}

          {/* Premium dark lab background with gradient */}
          <rect width="400" height="280" fill="url(#emagLabBg)" />
          <rect width="400" height="280" fill="url(#emagLabGrid)" />

          {/* Magnetic field lines with glow */}
          {curr !== 0 && (
            <g filter="url(#emagFieldBlur)" style={{ opacity: Math.min(1, fieldStrength / 5) }}>
              {[...Array(6)].map((_, i) => {
                const scale = 0.5 + (i * 0.15);
                return (
                  <ellipse
                    key={i}
                    cx="200"
                    cy="140"
                    rx={40 * scale + fieldRadius}
                    ry={20 * scale + fieldRadius / 2}
                    fill="none"
                    stroke={curr > 0 ? 'url(#emagFieldGradBlue)' : 'url(#emagFieldGradRed)'}
                    strokeWidth="2"
                    strokeDasharray="8,4"
                    opacity={1 - (i * 0.12)}
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0"
                      to={curr > 0 ? "-24" : "24"}
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </ellipse>
                );
              })}
              {/* Central field glow */}
              <ellipse
                cx="200"
                cy="140"
                rx={30 + fieldRadius * 0.5}
                ry={15 + fieldRadius * 0.25}
                fill="url(#emagFieldGlow)"
              />
            </g>
          )}

          {/* Coil windings with premium copper gradient */}
          <g>
            {[...Array(coilCount)].map((_, i) => (
              <g key={i}>
                {/* Shadow/depth ellipse */}
                <ellipse
                  cx={162 + i * 4}
                  cy="142"
                  rx="15"
                  ry="30"
                  fill="none"
                  stroke="#78350f"
                  strokeWidth="4"
                  opacity="0.3"
                />
                {/* Main coil with gradient */}
                <ellipse
                  cx={160 + i * 4}
                  cy="140"
                  rx="15"
                  ry="30"
                  fill="none"
                  stroke="url(#emagCoilGrad)"
                  strokeWidth="3"
                />
                {/* Highlight */}
                <ellipse
                  cx={159 + i * 4}
                  cy="138"
                  rx="14"
                  ry="28"
                  fill="none"
                  stroke="url(#emagCoilHighlight)"
                  strokeWidth="1"
                  opacity="0.6"
                />
              </g>
            ))}
          </g>

          {/* Iron core (if enabled) with metallic gradient */}
          {core && (
            <g filter="url(#emagCoreInnerGlow)">
              {/* Core shadow */}
              <rect
                x="157"
                y="122"
                width={coilCount * 4 + 10}
                height="40"
                rx="4"
                fill="#1f2937"
                opacity="0.5"
              />
              {/* Main core with brushed metal gradient */}
              <rect
                x="155"
                y="120"
                width={coilCount * 4 + 10}
                height="40"
                rx="4"
                fill="url(#emagCoreGrad)"
                stroke="url(#emagCoreEdge)"
                strokeWidth="1.5"
              />
              {/* Core highlight line */}
              <rect
                x="155"
                y="120"
                width={coilCount * 4 + 10}
                height="3"
                rx="2"
                fill="#d1d5db"
                opacity="0.3"
              />
            </g>
          )}

          {/* Pole labels with premium styling */}
          {curr !== 0 && (
            <g filter="url(#emagPoleGlow)">
              {/* Left pole (N or S based on current) */}
              <circle cx="140" cy="140" r="16" fill={curr > 0 ? 'url(#emagNorthPole)' : 'url(#emagSouthPole)'} />
              <circle cx="140" cy="140" r="16" fill="none" stroke="white" strokeWidth="1" opacity="0.3" />

              {/* Right pole */}
              <circle cx={coilEndX + 20} cy="140" r="16" fill={curr > 0 ? 'url(#emagSouthPole)' : 'url(#emagNorthPole)'} />
              <circle cx={coilEndX + 20} cy="140" r="16" fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
            </g>
          )}

          {/* Battery/power source with premium gradient */}
          <g>
            <rect x="168" y="218" width="64" height="34" rx="6" fill="url(#emagBatteryGrad)" stroke="#4b5563" strokeWidth="1.5" />
            {/* Battery terminals */}
            <rect x="175" y="215" width="8" height="6" rx="1" fill="#dc2626" />
            <rect x="217" y="215" width="8" height="6" rx="1" fill="#3b82f6" />
            {/* Battery label background */}
            <rect x="174" y="225" width="52" height="20" rx="3" fill="#1f2937" opacity="0.5" />
          </g>

          {/* Wires with gradient and current flow */}
          <g>
            {/* Left wire */}
            <path
              d="M 160 170 L 160 218 L 168 218"
              fill="none"
              stroke={curr > 0 ? 'url(#emagWirePositive)' : curr < 0 ? 'url(#emagWireNegative)' : 'url(#emagWireNeutral)'}
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Right wire */}
            <path
              d={`M ${coilEndX} 170 L ${coilEndX} 218 L 232 218`}
              fill="none"
              stroke={curr > 0 ? 'url(#emagWireNegative)' : curr < 0 ? 'url(#emagWirePositive)' : 'url(#emagWireNeutral)'}
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Current flow particles */}
            {curr !== 0 && (
              <g filter="url(#emagCurrentBlur)">
                {[0, 1, 2].map((i) => {
                  const offset = ((animTime + i * 33) % 100) / 100;
                  const leftY = 170 + offset * 48;
                  const rightY = 170 + (1 - offset) * 48;
                  return (
                    <g key={i}>
                      {/* Left wire particles */}
                      <circle
                        cx="160"
                        cy={leftY}
                        r="3"
                        fill="url(#emagCurrentGlow)"
                      />
                      {/* Right wire particles */}
                      <circle
                        cx={coilEndX}
                        cy={rightY}
                        r="3"
                        fill="url(#emagCurrentGlow)"
                      />
                    </g>
                  );
                })}
              </g>
            )}
          </g>

          {/* Paper clips with premium metallic gradient */}
          {clips.map((clip, i) => (
            <g key={i} transform={`translate(${clip.x}, ${clip.y})`}>
              <path
                d="M -10 -6 L 10 -6 L 10 6 L -6 6 L -6 -2 L 6 -2"
                fill="none"
                stroke={clip.attracted ? 'url(#emagClipAttracted)' : 'url(#emagClipMetal)'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {clip.attracted && (
                <circle cx="0" cy="0" r="12" fill="url(#emagFieldGlow)" opacity="0.5" />
              )}
            </g>
          ))}

          {/* Info panels with premium gradient */}
          <g>
            {/* Field strength panel */}
            <rect x="15" y="15" width="110" height="55" rx="8" fill="url(#emagPanelGrad)" stroke="#374151" strokeWidth="1.5" />
            <rect x="15" y="15" width="110" height="55" rx="8" fill="none" stroke="white" strokeWidth="0.5" opacity="0.1" />

            {/* Polarity panel */}
            <rect x="275" y="15" width="110" height="55" rx="8" fill="url(#emagPanelGrad)" stroke="#374151" strokeWidth="1.5" />
            <rect x="275" y="15" width="110" height="55" rx="8" fill="none" stroke="white" strokeWidth="0.5" opacity="0.1" />
          </g>
        </svg>

        {/* Labels outside SVG using typo system */}
        <div className="flex justify-between px-4">
          <div className="text-center">
            <p style={{ fontSize: typo.label, color: '#9ca3af', marginBottom: '2px' }}>Field Strength</p>
            <p style={{ fontSize: typo.body, color: '#a855f7', fontWeight: 700 }}>
              {fieldStrength.toFixed(2)} T
            </p>
          </div>
          <div className="text-center">
            <p style={{ fontSize: typo.label, color: '#9ca3af', marginBottom: '2px' }}>Polarity</p>
            <p style={{
              fontSize: typo.body,
              fontWeight: 700,
              color: curr === 0 ? '#6b7280' : curr > 0 ? '#3b82f6' : '#ef4444'
            }}>
              {polarity}
            </p>
          </div>
          <div className="text-center">
            <p style={{ fontSize: typo.label, color: '#9ca3af', marginBottom: '2px' }}>Current</p>
            <p style={{ fontSize: typo.body, color: '#fbbf24', fontWeight: 700 }}>
              {curr.toFixed(1)} A
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderACMotor = (curr: number, ac: boolean, phase: number) => {
    const effectiveCurrent = ac ? curr * Math.sin(phase) : curr;
    const rotorAngle = ac ? phase * 2 : 0;

    return (
      <div className="space-y-3">
        <svg viewBox="0 0 400 280" className="w-full h-56">
          {renderSVGDefs()}

          {/* Premium dark lab background */}
          <rect width="400" height="280" fill="url(#emagLabBg)" />
          <rect width="400" height="280" fill="url(#emagLabGrid)" />

          {/* Stator (outer electromagnets) with premium styling */}
          <circle cx="200" cy="140" r="100" fill="none" stroke="url(#emagCoreGrad)" strokeWidth="10" />
          <circle cx="200" cy="140" r="95" fill="none" stroke="#374151" strokeWidth="1" opacity="0.5" />
          <circle cx="200" cy="140" r="105" fill="none" stroke="#4b5563" strokeWidth="1" opacity="0.3" />

          {/* Electromagnet coils on stator with premium gradients */}
          {[0, 90, 180, 270].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x = 200 + Math.cos(rad) * 80;
            const y = 140 + Math.sin(rad) * 80;
            const isActive = ac ? Math.abs(Math.sin(phase + (i * Math.PI / 2))) > 0.5 : curr > 0;

            return (
              <g key={i}>
                {/* Coil housing */}
                <rect
                  x={x - 18}
                  y={y - 18}
                  width="36"
                  height="36"
                  rx="6"
                  fill={isActive ? 'url(#emagCoilGrad)' : 'url(#emagCoreGrad)'}
                  stroke={isActive ? '#fbbf24' : '#6b7280'}
                  strokeWidth="2"
                />
                {/* Active field indicator */}
                {isActive && (
                  <g filter="url(#emagFieldBlur)">
                    <circle
                      cx={x}
                      cy={y}
                      r="28"
                      fill="none"
                      stroke={i % 2 === 0 ? 'url(#emagFieldGradBlue)' : 'url(#emagFieldGradRed)'}
                      strokeWidth="3"
                      strokeDasharray="6,3"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="0"
                        to="-18"
                        dur="0.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>
                )}
              </g>
            );
          })}

          {/* Rotor (inner permanent magnet) with premium styling */}
          <g transform={`rotate(${(rotorAngle * 180) / Math.PI}, 200, 140)`}>
            {/* Rotor body */}
            <circle cx="200" cy="140" r="42" fill="url(#emagCoreGrad)" stroke="#4b5563" strokeWidth="2" />
            <circle cx="200" cy="140" r="38" fill="none" stroke="#6b7280" strokeWidth="1" opacity="0.5" />

            {/* N pole with premium gradient */}
            <g filter="url(#emagPoleGlow)">
              <path d="M 200 98 L 212 126 L 188 126 Z" fill="url(#emagNorthPole)" />
              <path d="M 200 98 L 212 126 L 188 126 Z" fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
            </g>

            {/* S pole with premium gradient */}
            <g filter="url(#emagPoleGlow)">
              <path d="M 200 182 L 212 154 L 188 154 Z" fill="url(#emagSouthPole)" />
              <path d="M 200 182 L 212 154 L 188 154 Z" fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
            </g>
          </g>

          {/* Shaft with metallic gradient */}
          <rect x="193" y="180" width="14" height="65" rx="2" fill="url(#emagCoreGrad)" stroke="#4b5563" strokeWidth="1" />

          {/* Info panels */}
          <g>
            {/* Current waveform panel */}
            <rect x="15" y="15" width="125" height="65" rx="8" fill="url(#emagPanelGrad)" stroke="#374151" strokeWidth="1.5" />

            {/* Waveform visualization */}
            {ac ? (
              <path
                d={`M 25 52 ${[...Array(22)].map((_, i) => `L ${25 + i * 5} ${52 + Math.sin((i / 3.5) + phase) * 12}`).join(' ')}`}
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            ) : (
              <line x1="25" y1="52" x2="130" y2="52" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
            )}

            {/* Mode panel */}
            <rect x="260" y="15" width="125" height="65" rx="8" fill="url(#emagPanelGrad)" stroke="#374151" strokeWidth="1.5" />
          </g>
        </svg>

        {/* Labels outside SVG using typo system */}
        <div className="flex justify-between px-4">
          <div className="text-center">
            <p style={{ fontSize: typo.label, color: '#9ca3af', marginBottom: '2px' }}>
              {ac ? 'AC Current' : 'DC Current'}
            </p>
            <p style={{ fontSize: typo.body, color: '#22c55e', fontWeight: 700 }}>
              {ac ? 'Alternating' : 'Steady'}
            </p>
          </div>
          <div className="text-center">
            <p style={{ fontSize: typo.label, color: '#9ca3af', marginBottom: '2px' }}>Motor Mode</p>
            <p style={{
              fontSize: typo.body,
              fontWeight: 700,
              color: ac ? '#22c55e' : '#fbbf24'
            }}>
              {ac ? 'AC ROTATING' : 'DC STATIC'}
            </p>
          </div>
          <div className="text-center">
            <p style={{ fontSize: typo.label, color: '#9ca3af', marginBottom: '2px' }}>Rotor</p>
            <p style={{ fontSize: typo.body, color: '#a855f7', fontWeight: 700 }}>
              {ac ? 'Spinning' : 'Aligned'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">How Do Electric Motors Spin?</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-lg leading-relaxed">
          Every electric car, washing machine, and fan uses electric motors.
          But how does <span className="text-yellow-400">electricity</span> create
          <span className="text-purple-400"> magnetic force</span>?
        </p>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-blue-300 font-medium">
            The secret is the electromagnet—a magnet you can turn on and off!
          </p>
        </div>
        <p className="text-gray-400 mt-4">
          Discover how coils of wire become powerful magnets that lift cars
          and power trains!
        </p>
      </div>
      <button
        onMouseDown={() => { playSound('click'); nextPhase(); }}
        className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all"
      >
        Discover the Secret
      </button>
    </div>
  );

  const renderPredict = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">Make Your Prediction</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 mb-6">
          If you pass electric current through a coil of wire, what will happen?
        </p>
        <div className="space-y-3">
          {[
            'Nothing - wire isn\'t magnetic',
            'The wire will create a magnetic field',
            'The wire will get hot but not magnetic',
            'The wire will repel all metals'
          ].map((option, i) => (
            <button
              key={i}
              onMouseDown={() => {
                playSound('click');
                setPrediction(option);
              }}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                prediction === option
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {prediction && (
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all"
        >
          Test Your Prediction
        </button>
      )}
    </div>
  );

  const renderPlay = () => {
    const fieldStrength = calculateFieldStrength(Math.abs(current), coilTurns, hasCore);

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">Build an Electromagnet</h2>

        <div className="bg-gray-800 rounded-xl p-6">
          {renderElectromagnet(current, coilTurns, hasCore, paperClipPositions)}

          <div className="grid grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-yellow-400 font-medium mb-2" style={{ fontSize: typo.body }}>
                Current: {current.toFixed(1)} A
              </label>
              <input
                type="range"
                min="-5"
                max="5"
                step="0.5"
                value={current}
                onChange={(e) => setCurrent(Number(e.target.value))}
                className="w-full accent-yellow-500"
              />
              <div className="flex justify-between mt-1" style={{ fontSize: typo.label, color: '#6b7280' }}>
                <span>-5A</span>
                <span>0</span>
                <span>+5A</span>
              </div>
            </div>
            <div>
              <label className="block text-orange-400 font-medium mb-2" style={{ fontSize: typo.body }}>
                Coil Turns: {coilTurns}
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={coilTurns}
                onChange={(e) => setCoilTurns(Number(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>
          </div>

          <div className="flex justify-center mt-4">
            <button
              onMouseDown={() => {
                playSound('click');
                setHasCore(!hasCore);
              }}
              className={`px-6 py-3 rounded-lg font-bold ${
                hasCore
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {hasCore ? 'Iron Core: ON' : 'Iron Core: OFF'}
            </button>
          </div>

          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <p className="text-gray-300 text-center" style={{ fontSize: typo.body }}>
              Field Strength: <span className="text-purple-400 font-bold">{fieldStrength.toFixed(3)} T</span>
              {hasCore && <span className="text-green-400 ml-2">(1000x with iron core!)</span>}
            </p>
          </div>
        </div>

        <div className="text-center">
          <button
            onMouseDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all"
          >
            Understand the Physics
          </button>
        </div>
      </div>
    );
  };

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Oersted&apos;s Discovery</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-600">
          <h3 className="text-purple-400 font-bold mb-2">Electricity Creates Magnetism</h3>
          <p className="text-gray-300">
            In 1820, Hans Christian Oersted discovered that electric current creates
            a magnetic field around the wire. <span className="text-yellow-400 font-bold">
            Coiling the wire concentrates this field</span>.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-gray-700 rounded-lg text-center">
            <div className="text-2xl mb-1">⚡</div>
            <p style={{ fontSize: typo.label, color: '#9ca3af' }}>More Current</p>
            <p className="text-purple-400 font-bold" style={{ fontSize: typo.small }}>Stronger</p>
          </div>
          <div className="p-3 bg-gray-700 rounded-lg text-center">
            <div className="text-2xl mb-1">🔄</div>
            <p style={{ fontSize: typo.label, color: '#9ca3af' }}>More Turns</p>
            <p className="text-purple-400 font-bold" style={{ fontSize: typo.small }}>Stronger</p>
          </div>
          <div className="p-3 bg-gray-700 rounded-lg text-center">
            <div className="text-2xl mb-1">🧲</div>
            <p style={{ fontSize: typo.label, color: '#9ca3af' }}>Iron Core</p>
            <p className="text-purple-400 font-bold" style={{ fontSize: typo.small }}>1000x Stronger!</p>
          </div>
        </div>

        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300" style={{ fontSize: typo.body }}>
            <strong>Key Equation:</strong> B = μ₀ × n × I
            <br />
            <span style={{ fontSize: typo.small }}>Field strength = permeability × turns/length × current</span>
          </p>
        </div>

        <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-600">
          <p className="text-blue-300" style={{ fontSize: typo.body }}>
            <strong>Why Iron Helps:</strong> Iron atoms act like tiny magnets that align
            with the coil&apos;s field, amplifying it by ~1000×. This is called &quot;ferromagnetism.&quot;
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all"
        >
          What If We Reverse Current?
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">The Motor Question</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 mb-6">
          If we rapidly switch the current direction back and forth (AC current),
          what will happen to the magnetic field?
        </p>
        <div className="space-y-3">
          {[
            'The field will disappear',
            'The field will stay the same direction',
            'The field will flip north/south rapidly',
            'The field will become twice as strong'
          ].map((option, i) => (
            <button
              key={i}
              onMouseDown={() => {
                playSound('click');
                setTwistPrediction(option);
              }}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                twistPrediction === option
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {twistPrediction && (
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all"
        >
          See What Happens
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">AC vs DC: Making Motors Spin</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        {renderACMotor(twistCurrent, isAC, acPhase)}

        <div className="flex justify-center gap-4 mt-6">
          <button
            onMouseDown={() => {
              playSound('click');
              setIsAC(false);
            }}
            className={`px-6 py-3 rounded-lg font-bold ${
              !isAC ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            DC (Static)
          </button>
          <button
            onMouseDown={() => {
              playSound('click');
              setIsAC(true);
            }}
            className={`px-6 py-3 rounded-lg font-bold ${
              isAC ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            AC (Alternating)
          </button>
        </div>

        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-300 text-center" style={{ fontSize: typo.body }}>
            {isAC ? (
              <>
                <span className="text-green-400 font-bold">AC creates a rotating magnetic field!</span>
                <br />
                <span style={{ fontSize: typo.small }}>The rotor chases the field, causing continuous rotation.</span>
              </>
            ) : (
              <>
                <span className="text-yellow-400 font-bold">DC creates a static field.</span>
                <br />
                <span style={{ fontSize: typo.small }}>The rotor aligns once, then stops. Motors need commutators to keep spinning.</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); setIsAC(false); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all"
        >
          Understand Motor Physics
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">How Motors Work</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-green-900/30 rounded-lg border border-green-600">
          <h3 className="text-green-400 font-bold mb-2">The Rotating Field Principle</h3>
          <p className="text-gray-300" style={{ fontSize: typo.body }}>
            <span className="text-yellow-400 font-bold">Reversing current reverses the magnetic poles.</span>{' '}
            By rapidly alternating current in multiple coils, we create a magnetic field
            that appears to rotate—and any magnet inside will spin trying to follow it!
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-yellow-400 font-bold mb-2">DC Motors</h4>
            <ul className="text-gray-300 space-y-1" style={{ fontSize: typo.small }}>
              <li>Need brushes/commutator to switch current</li>
              <li>Simple speed control</li>
              <li>Brushes wear out over time</li>
              <li>Used in toys, small appliances</li>
            </ul>
          </div>
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-green-400 font-bold mb-2">AC Motors</h4>
            <ul className="text-gray-300 space-y-1" style={{ fontSize: typo.small }}>
              <li>No brushes needed</li>
              <li>Grid power is already AC</li>
              <li>Very reliable, long-lasting</li>
              <li>Used in industry, EVs, fans</li>
            </ul>
          </div>
        </div>

        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300" style={{ fontSize: typo.small }}>
            <strong>Fun Fact:</strong> Nikola Tesla invented the AC induction motor in 1887.
            It&apos;s called &quot;induction&quot; because the rotating field induces current in the rotor,
            making it magnetic without any electrical connection!
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all"
        >
          See Real Applications
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Real-World Electromagnets</h2>
      <p className="text-gray-400 text-center">Explore how electromagnets power our world</p>

      <div className="grid grid-cols-2 gap-4">
        {TRANSFER_APPS.map((app, i) => (
          <button
            key={i}
            onMouseDown={() => {
              playSound('click');
              setCompletedApps(prev => new Set([...prev, i]));
            }}
            className={`p-4 rounded-xl text-left transition-all ${
              completedApps.has(i)
                ? 'bg-green-900/30 border-2 border-green-600'
                : 'bg-gray-800 border-2 border-gray-700 hover:border-purple-500'
            }`}
          >
            <div className="text-3xl mb-2">{app.icon}</div>
            <h3 className="text-white font-bold mb-1">{app.title}</h3>
            <p className="text-gray-400" style={{ fontSize: typo.small }}>{app.description}</p>
            {completedApps.has(i) && (
              <div className="mt-2 text-green-400" style={{ fontSize: typo.small }}>Explored</div>
            )}
          </button>
        ))}
      </div>

      {completedApps.size >= 4 && (
        <div className="text-center">
          <button
            onMouseDown={() => { playSound('complete'); nextPhase(); }}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all"
          >
            Take the Test
          </button>
        </div>
      )}

      {completedApps.size < 4 && (
        <p className="text-center text-gray-500" style={{ fontSize: typo.small }}>
          Explore all {4 - completedApps.size} remaining applications to continue
        </p>
      )}
    </div>
  );

  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const isComplete = currentQuestion >= TEST_QUESTIONS.length;

    if (isComplete) {
      const score = testAnswers.reduce(
        (acc, answer, i) => acc + (TEST_QUESTIONS[i].options[answer]?.correct ? 1 : 0),
        0
      );
      const passingScore = Math.ceil(TEST_QUESTIONS.length * 0.7);
      const passed = score >= passingScore;
      if (passed && onCorrectAnswer) onCorrectAnswer();

      return (
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-white">Test Complete!</h2>
          <div className={`text-6xl font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>
            {score}/{TEST_QUESTIONS.length}
          </div>
          <p className="text-gray-300">
            {passed ? 'Excellent understanding of electromagnets!' : 'Review the concepts and try again.'}
          </p>
          <button
            onMouseDown={() => {
              if (passed) {
                playSound('complete');
                nextPhase();
              } else {
                playSound('click');
                setTestAnswers([]);
              }
            }}
            className={`px-8 py-4 rounded-xl font-bold text-lg ${
              passed
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
            }`}
          >
            {passed ? 'Complete Lesson' : 'Try Again'}
          </button>
        </div>
      );
    }

    const question = TEST_QUESTIONS[currentQuestion];

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">Knowledge Check</h2>
        <div className="flex justify-center gap-2 mb-4">
          {TEST_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < currentQuestion
                  ? TEST_QUESTIONS[i].options[testAnswers[i]]?.correct
                    ? 'bg-green-500'
                    : 'bg-red-500'
                  : i === currentQuestion
                    ? 'bg-purple-500'
                    : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-white text-lg mb-6">{question.question}</p>
          <div className="space-y-3">
            {question.options.map((option, i) => (
              <button
                key={i}
                onMouseDown={() => {
                  playSound(option.correct ? 'success' : 'failure');
                  setTestAnswers([...testAnswers, i]);
                }}
                className="w-full p-4 bg-gray-700 text-gray-300 rounded-lg text-left hover:bg-gray-600 transition-all"
              >
                {option.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl mb-4">🏆</div>
      <h2 className="text-3xl font-bold text-white">Electromagnet Master!</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-gray-300 mb-4">You&apos;ve mastered:</p>
        <ul className="text-left text-gray-300 space-y-2">
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Current creates magnetic fields
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Coils concentrate the field
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Iron cores amplify 1000×
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> AC creates rotating fields for motors
          </li>
        </ul>
      </div>
      <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-600 max-w-md mx-auto">
        <p className="text-purple-300">
          Key Insight: Electromagnets are switchable magnets—turn on current, get magnetism!
        </p>
      </div>
      <button
        onMouseDown={() => {
          playSound('complete');
          if (onPhaseComplete) onPhaseComplete();
        }}
        className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
      >
        Claim Your Badge
      </button>
    </div>
  );

  // ─── Main Render ─────────────────────────────────────────────────────────────
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
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {renderProgressBar()}

        {/* Phase indicator */}
        <div className="text-center mb-6">
          <span className="px-3 py-1 bg-purple-900/50 text-purple-300 rounded-full text-sm">
            {phase.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {renderPhase()}

        {/* Navigation */}
        {phase !== 'hook' && phase !== 'mastery' && (
          <div className="mt-8 flex justify-between">
            <button
              onMouseDown={() => {
                const currentIndex = PHASES.indexOf(phase);
                if (currentIndex > 0) {
                  goToPhase(PHASES[currentIndex - 1]);
                }
              }}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all"
            >
              Back
            </button>
            <div className="text-gray-500 text-sm">
              {PHASES.indexOf(phase) + 1} / {PHASES.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
