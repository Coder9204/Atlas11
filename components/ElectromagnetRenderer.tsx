'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
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

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'current_changed'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

interface ElectromagnetRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
  setTestScore?: (score: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const phaseOrder: Phase[] = [
  'hook', 'predict', 'play', 'review',
  'twist_predict', 'twist_play', 'twist_review',
  'transfer', 'test', 'mastery'
];

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

// ─────────────────────────────────────────────────────────────────────────────
// REAL-WORLD APPLICATIONS - Detailed with stats, examples, companies
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🏥',
    title: 'MRI Medical Imaging',
    short: 'Superconducting electromagnets enable detailed body scans',
    tagline: 'See inside the human body without surgery',
    description: 'MRI machines use superconducting electromagnets cooled to near absolute zero to create magnetic fields 60,000 times stronger than Earth\'s, allowing doctors to visualize soft tissues, organs, and even brain activity in remarkable detail without harmful radiation.',
    connection: 'The electromagnet principle you learned - current through coils creates magnetic fields - is scaled up massively using superconducting wire that has zero electrical resistance when cooled.',
    howItWorks: 'Liquid helium cools the coils to -269C (4 Kelvin), enabling enormous currents to flow without resistance or heat generation. These currents generate stable 1.5-7 Tesla fields that align hydrogen atoms in your body, which then emit radio signals used to create detailed images.',
    stats: [
      { value: '40,000+', label: 'MRI machines worldwide', icon: '🌍' },
      { value: '$8B', label: 'Annual MRI market size', icon: '📈' },
      { value: '7 Tesla', label: 'Strongest clinical MRI field', icon: '⚡' }
    ],
    examples: ['Brain tumor detection and monitoring', 'Spinal cord injury imaging', 'Heart disease diagnosis', 'Sports injury assessment (torn ligaments)'],
    companies: ['Siemens Healthineers', 'GE Healthcare', 'Philips Medical', 'Canon Medical Systems'],
    futureImpact: 'Ultra-high-field MRI at 10+ Tesla will reveal cellular-level details, while portable MRI units using new magnet technology will bring scanning to rural areas and ambulances.',
    color: '#3B82F6'
  },
  {
    icon: '🚄',
    title: 'Maglev High-Speed Trains',
    short: 'Electromagnetic levitation for frictionless travel at 600+ km/h',
    tagline: 'Float above the track at airplane speeds',
    description: 'Maglev (magnetic levitation) trains use powerful electromagnets to both levitate the train above the track and propel it forward, eliminating wheel friction entirely. This enables speeds over 600 km/h while being quieter and more energy-efficient than conventional trains.',
    connection: 'The controllable nature of electromagnets - adjust current to adjust force - enables precise levitation height control and smooth acceleration. This is the same on/off control you explored in the simulation.',
    howItWorks: 'Superconducting magnets on the train interact with coils embedded in the guideway. Alternating the current in track coils creates a traveling magnetic wave that both levitates the train (10mm gap) and pulls it forward at tremendous speeds.',
    stats: [
      { value: '603 km/h', label: 'World speed record (Japan L0)', icon: '🏎️' },
      { value: '430 km/h', label: 'Shanghai commercial maglev', icon: '🚅' },
      { value: '10mm', label: 'Typical levitation gap', icon: '📏' }
    ],
    examples: ['Shanghai Maglev Airport Express (China)', 'Chuo Shinkansen (Japan, under construction)', 'Incheon Airport Maglev (Korea)', 'Changsha Maglev Express (China)'],
    companies: ['Central Japan Railway (JR Central)', 'CRRC Corporation', 'Siemens Mobility', 'ThyssenKrupp Transrapid'],
    futureImpact: 'Hyperloop-style vacuum tube maglev systems could achieve 1,000+ km/h, making travel between major cities faster than flying when accounting for airport time.',
    color: '#8B5CF6'
  },
  {
    icon: '⚡',
    title: 'Electric Motors & Generators',
    short: 'Converting electricity to motion (and back) with 95%+ efficiency',
    tagline: 'The heartbeat of the electric revolution',
    description: 'Electric motors use electromagnets to create rotating magnetic fields that interact with permanent magnets or induced currents, converting electrical energy into mechanical motion. The same principle works in reverse for generators. Motors power everything from electric vehicles to industrial robots with over 95% efficiency.',
    connection: 'AC current through stator coils creates a rotating magnetic field - exactly what you explored in the twist phase with alternating current direction causing the magnetic poles to flip.',
    howItWorks: 'In an AC induction motor, alternating current in stationary coils (stator) creates a magnetic field that rotates. This induces currents in the rotor bars, making the rotor magnetic and causing it to spin, chasing the rotating field with a small "slip."',
    stats: [
      { value: '50%', label: 'Of global electricity powers motors', icon: '🔌' },
      { value: '95%+', label: 'Peak motor efficiency (vs 25% for gas engines)', icon: '♻️' },
      { value: '$150B', label: 'Global electric motor market', icon: '💰' }
    ],
    examples: ['Tesla Model S/3/X/Y drive motors (up to 670 hp)', 'Industrial pumps, fans, and compressors', 'Drone and quadcopter propulsion', 'Refrigerator and HVAC compressors'],
    companies: ['Tesla', 'Nidec Corporation', 'ABB', 'Siemens', 'BorgWarner'],
    futureImpact: 'Axial flux motors and solid-state designs without rare earth magnets will make EVs cheaper and more sustainable, while direct-drive motors will transform wind turbines and aircraft propulsion.',
    color: '#22C55E'
  },
  {
    icon: '🏗️',
    title: 'Industrial Lifting Electromagnets',
    short: 'Lifting tons of steel with the flip of a switch',
    tagline: 'Pick up a car, drop it on command',
    description: 'Industrial electromagnets in scrapyards, steel mills, and manufacturing facilities can lift entire cars and tons of metal debris. Unlike permanent magnets, they can release their load instantly by cutting the current - the ultimate demonstration of controllable magnetism at massive scale.',
    connection: 'This is the most direct application of what you learned: high current + many coil turns + iron core = incredibly powerful, switchable magnet. The same B = u * n * I equation, just with industrial numbers.',
    howItWorks: 'A large soft iron core is wrapped with hundreds of turns of thick copper wire carrying hundreds of amperes. The iron amplifies the field by 1000x or more, creating enough magnetic force to lift vehicles. Cutting power instantly demagnetizes the iron, releasing the load.',
    stats: [
      { value: '20,000 kg', label: 'Maximum lift capacity of large units', icon: '🏋️' },
      { value: '4+ Tesla', label: 'Field strength achieved at pole faces', icon: '🧲' },
      { value: '500+ A', label: 'Typical operating current', icon: '⚡' }
    ],
    examples: ['Auto recycling and shredder facilities', 'Steel mill material handling', 'Shipping container yard operations', 'Scrap metal sorting plants'],
    companies: ['Eriez Magnetics', 'Walker Magnetics', 'Ohio Magnetics', 'Bunting Magnetics', 'Walmag Magnetics'],
    futureImpact: 'AI-controlled electromagnets with machine vision will automatically sort mixed metal waste by alloy type, dramatically improving recycling efficiency and reducing landfill waste.',
    color: '#F59E0B'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based questions with explanations
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "A student wraps copper wire around a nail and connects it to a battery. When the circuit is complete, the nail picks up paper clips.",
    question: "What causes the nail to become magnetic when current flows through the wire?",
    options: [
      { id: 'a', text: "The battery transfers its magnetic energy to the nail", correct: false },
      { id: 'b', text: "The electric current flowing through the wire creates a magnetic field around it", correct: true },
      { id: 'c', text: "The copper wire is naturally magnetic when heated by electricity", correct: false },
      { id: 'd', text: "The nail absorbs static electricity from the wire insulation", correct: false }
    ],
    explanation: "When electric current flows through a wire, it creates a circular magnetic field around the wire. Coiling the wire concentrates this field, and the iron nail amplifies it by aligning its magnetic domains with the field. This is the fundamental principle discovered by Hans Christian Oersted in 1820."
  },
  {
    scenario: "A junkyard uses a crane with a large electromagnet to sort metal scraps. The operator needs to pick up a car, move it to a pile, and release it.",
    question: "What is the main advantage of using an electromagnet instead of a permanent magnet for this task?",
    options: [
      { id: 'a', text: "Electromagnets are always stronger than permanent magnets", correct: false },
      { id: 'b', text: "Electromagnets can be turned on to grab objects and off to release them", correct: true },
      { id: 'c', text: "Electromagnets are lighter and easier to mount on cranes", correct: false },
      { id: 'd', text: "Permanent magnets would rust when exposed to metal scraps", correct: false }
    ],
    explanation: "The key advantage of electromagnets is controllability. By switching the current on or off, operators can grab metal objects (current on, magnetic field present) and release them precisely where needed (current off, field disappears). A permanent magnet would require mechanical force to separate it from the metal."
  },
  {
    scenario: "An engineer is designing an electromagnet for a recycling facility. The initial design uses 50 turns of wire carrying 2 amperes of current, but it needs to be twice as strong.",
    question: "Which modification would double the electromagnet's field strength?",
    options: [
      { id: 'a', text: "Use wire with twice the diameter", correct: false },
      { id: 'b', text: "Double the current to 4 amperes OR double the turns to 100", correct: true },
      { id: 'c', text: "Add a plastic core inside the coil", correct: false },
      { id: 'd', text: "Paint the wire with magnetic paint", correct: false }
    ],
    explanation: "The magnetic field strength of a solenoid is proportional to both the current (I) and the number of turns (n): B = u0 * n * I. Doubling either the current or the number of turns will double the field strength. Wire diameter affects resistance but not the field directly, and plastic is not ferromagnetic so it won't amplify the field."
  },
  {
    scenario: "A toy car's DC motor suddenly stops working. When you open it, you see that the metal brushes that contact the spinning commutator are completely worn away.",
    question: "Why are brushes and a commutator necessary in a DC motor?",
    options: [
      { id: 'a', text: "They cool down the motor by conducting heat away from the coils", correct: false },
      { id: 'b', text: "They reverse the current direction in the rotor coils at the right moment to maintain rotation", correct: true },
      { id: 'c', text: "They provide lubrication between the rotor and stator", correct: false },
      { id: 'd', text: "They amplify the voltage from the battery to increase speed", correct: false }
    ],
    explanation: "In a DC motor, the rotor would simply align with the magnetic field and stop if the current direction stayed constant. The commutator and brushes mechanically reverse the current direction in the rotor coils every half rotation, ensuring the rotor continuously 'chases' the magnetic field and keeps spinning."
  },
  {
    scenario: "An MRI technician explains that the hospital's MRI machine contains an electromagnet producing a field of 3 Tesla - about 60,000 times stronger than Earth's magnetic field - yet doesn't require enormous amounts of electricity.",
    question: "What technology allows MRI machines to achieve such powerful magnetic fields efficiently?",
    options: [
      { id: 'a', text: "Superconducting coils cooled to near absolute zero, eliminating electrical resistance", correct: true },
      { id: 'b', text: "Rare earth permanent magnets that don't need electricity at all", correct: false },
      { id: 'c', text: "Pulsed electromagnets that only activate during scans", correct: false },
      { id: 'd', text: "Multiple small electromagnets arranged in a special pattern", correct: false }
    ],
    explanation: "MRI machines use superconducting electromagnets cooled with liquid helium to around 4 Kelvin (-269C). At these temperatures, the wire has zero electrical resistance, so once current is established, it flows indefinitely without power loss. This allows extremely high currents and powerful fields without continuous energy consumption or heat generation."
  },
  {
    scenario: "A physicist holds a current-carrying wire pointing upward. Using the right-hand rule, she points her thumb in the direction of conventional current flow (upward).",
    question: "In which direction do her curled fingers indicate the magnetic field circulates?",
    options: [
      { id: 'a', text: "The field lines point straight up, parallel to the current", correct: false },
      { id: 'b', text: "The field circulates counterclockwise when viewed from above", correct: true },
      { id: 'c', text: "The field points straight down, opposite to the current", correct: false },
      { id: 'd', text: "The field radiates outward in all directions like light from a bulb", correct: false }
    ],
    explanation: "The right-hand rule states: point your thumb in the direction of conventional current, and your curled fingers show the direction of the magnetic field lines. These field lines form concentric circles around the wire, circulating counterclockwise when viewed from the direction the current is flowing. This circular field pattern is why coiling wire into a solenoid concentrates the magnetic field."
  },
  {
    scenario: "An automotive engineer is designing a solenoid actuator for a fuel injector that must respond extremely quickly (within milliseconds) when the engine computer signals it to open.",
    question: "Why might the engineer choose fewer coil turns with higher current rather than more turns with lower current?",
    options: [
      { id: 'a', text: "Fewer turns make the solenoid physically smaller, which is the only consideration", correct: false },
      { id: 'b', text: "More turns create higher inductance, which slows how fast current (and the magnetic field) can change", correct: true },
      { id: 'c', text: "The magnetic field only forms at the ends of the coil, so fewer turns is always better", correct: false },
      { id: 'd', text: "Higher current produces a different type of magnetism that acts faster", correct: false }
    ],
    explanation: "Inductance (L) is proportional to the square of the number of turns (L proportional to n^2). Higher inductance opposes changes in current, slowing the time for the magnetic field to build up or collapse. For fast-acting applications like fuel injectors, using fewer turns with higher current reduces inductance and allows rapid response times, even though it may require more robust power electronics."
  },
  {
    scenario: "A student keeps increasing the current through an electromagnet with an iron core. Initially, doubling the current doubles the magnetic field strength, but at very high currents, the field increases much more slowly.",
    question: "What phenomenon explains why the magnetic field stops increasing proportionally at high currents?",
    options: [
      { id: 'a', text: "The wire insulation begins to melt, creating resistance", correct: false },
      { id: 'b', text: "The iron core reaches magnetic saturation - nearly all its magnetic domains are already aligned", correct: true },
      { id: 'c', text: "The magnetic field lines start canceling each other out", correct: false },
      { id: 'd', text: "The battery voltage drops due to the high current draw", correct: false }
    ],
    explanation: "Magnetic saturation occurs when nearly all the magnetic domains in a ferromagnetic material (like iron) have aligned with the external field. Once saturated, there are no more domains left to align, so further increases in current only add the small field from the coil itself, not the massive amplification from the core. Most iron cores saturate around 1.5-2.0 Tesla."
  },
  {
    scenario: "The Large Hadron Collider at CERN uses superconducting electromagnets cooled to 1.9 Kelvin (colder than outer space) to bend particle beams traveling near the speed of light around a 27-kilometer ring.",
    question: "Why must these magnets use superconductors rather than conventional copper wire?",
    options: [
      { id: 'a', text: "Copper cannot be formed into coils large enough for the accelerator", correct: false },
      { id: 'b', text: "Superconductors can carry the enormous currents needed without energy loss or heat that would melt copper", correct: true },
      { id: 'c', text: "Superconductors are magnetic, while copper is not", correct: false },
      { id: 'd', text: "The cold temperature is needed to slow down the particles, and superconductors provide it", correct: false }
    ],
    explanation: "Bending particles at near-light speeds requires magnetic fields of 8+ Tesla, which demands currents of over 11,000 amperes. In normal copper wire, this would generate enormous heat (P = I^2 * R), making the magnets impossible to cool. Superconductors have zero resistance, allowing these massive currents to flow without any energy loss, making the LHC technically and economically feasible."
  },
  {
    scenario: "A home automation system uses a small electromagnetic relay to control a 240V air conditioning unit. The relay coil operates on just 5V from a microcontroller, yet can safely switch the high-voltage AC power.",
    question: "How does the relay allow a low-voltage control signal to switch high-voltage power safely?",
    options: [
      { id: 'a', text: "The relay amplifies the 5V signal to 240V before passing it through", correct: false },
      { id: 'b', text: "The relay coil is connected directly to the 240V circuit, converting it to 5V", correct: false },
      { id: 'c', text: "The electromagnetic coil mechanically moves a switch contact, keeping control and power circuits electrically isolated", correct: true },
      { id: 'd', text: "The relay stores energy from the 240V line and releases it in small 5V bursts", correct: false }
    ],
    explanation: "A relay provides galvanic isolation - the low-voltage control circuit and high-voltage power circuit are completely separate electrically. When 5V energizes the relay coil, it creates a magnetic field that physically pulls a metal armature, which mechanically closes (or opens) the contacts in the separate 240V circuit. This allows safe control of dangerous voltages from low-power electronics."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ElectromagnetRenderer({
  onGameEvent,
  gamePhase,
  onPhaseComplete,
  setTestScore
}: ElectromagnetRendererProps) {
  // ─── Responsive Detection ──────────────────────────────────────────────────
  const { isMobile } = useViewport();
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
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  });
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [confirmedIndex, setConfirmedIndex] = useState<number | null>(null);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Simulation state - Play phase
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

  const lastClickRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // ─── Sync with external phase control ──────────────────────────────────────
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // ─── Web Audio API Sound System ────────────────────────────────────────────
  const playSound = useCallback((soundType: 'click' | 'correct' | 'incorrect' | 'complete' | 'transition' | 'buzz') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      switch (soundType) {
        case 'click':
        case 'transition':
          oscillator.frequency.setValueAtTime(440, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
          break;
        case 'correct':
          oscillator.frequency.setValueAtTime(523, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'incorrect':
          oscillator.frequency.setValueAtTime(200, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.25);
          break;
        case 'complete':
          oscillator.frequency.setValueAtTime(523, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
          oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.45);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.6);
          break;
        case 'buzz':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(60, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.2);
          break;
      }
    } catch {
      // Audio not available
    }
  }, []);

  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
  }, [playSound, onPhaseComplete, onGameEvent]);

  // ─── Animation Effects ─────────────────────────────────────────────────────
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

  // Reset simulation state when entering play phases
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

  useEffect(() => {
    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', data: { phase } });
    }
  }, [phase, onGameEvent]);

  // ─── Event Handlers ────────────────────────────────────────────────────────
  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'B' } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'C' } });
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    onGameEvent?.({ type: 'test_answered', data: { questionIndex, answerIndex } });
  }, [onGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'app_explored', data: { appIndex } });
  }, [playSound, onGameEvent]);

  const calculateScore = useCallback(() => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  }, [testAnswers]);

  // ─── Helper Functions ──────────────────────────────────────────────────────
  function calculateFieldStrength(curr: number, turns: number, core: boolean): number {
    // B proportional to u * n * I (simplified)
    const coreMultiplier = core ? 1000 : 1;
    return curr * turns * coreMultiplier * 0.001; // Scale for display
  }

  // ─── SVG Defs for Premium Visualization ────────────────────────────────────
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

  // ─── Electromagnet Visualization ───────────────────────────────────────────
  const renderElectromagnet = (curr: number, turns: number, core: boolean, clips: typeof paperClipPositions) => {
    const fieldStrength = calculateFieldStrength(Math.abs(curr), turns, core);
    const fieldRadius = Math.min(80, fieldStrength * 8);
    const polarity = curr > 0 ? 'N-S' : curr < 0 ? 'S-N' : 'OFF';
    const coilCount = Math.min(turns, 20);
    const coilEndX = 160 + coilCount * 4;

    return (
      <div className="space-y-3">
        <svg viewBox="0 0 400 280" className="w-full h-56" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Electromagnet visualization">
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
                    ry={35 * scale + fieldRadius * 0.8}
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
                ry={25 + fieldRadius * 0.4}
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
              <text x="140" y="145" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                {curr > 0 ? 'N' : 'S'}
              </text>

              {/* Right pole */}
              <circle cx={coilEndX + 20} cy="140" r="16" fill={curr > 0 ? 'url(#emagSouthPole)' : 'url(#emagNorthPole)'} />
              <circle cx={coilEndX + 20} cy="140" r="16" fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
              <text x={coilEndX + 20} y="145" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                {curr > 0 ? 'S' : 'N'}
              </text>
            </g>
          )}

          {/* Battery/power source with premium gradient */}
          <g>
            <rect x="168" y="228" width="64" height="28" rx="6" fill="url(#emagBatteryGrad)" stroke="#4b5563" strokeWidth="1.5" />
            {/* Battery terminals */}
            <rect x="175" y="225" width="8" height="6" rx="1" fill="#dc2626" />
            <rect x="217" y="225" width="8" height="6" rx="1" fill="#3b82f6" />
            {/* Battery label background */}
            <rect x="174" y="232" width="52" height="18" rx="3" fill="#1f2937" opacity="0.5" />
            <text x="200" y="245" textAnchor="middle" fill="#9ca3af" fontSize="11">
              {Math.abs(curr).toFixed(1)}A
            </text>
          </g>

          {/* Wires with gradient and current flow */}
          <g>
            {/* Left wire */}
            <path
              d="M 160 170 L 160 242 L 168 242"
              fill="none"
              stroke={curr > 0 ? 'url(#emagWirePositive)' : curr < 0 ? 'url(#emagWireNegative)' : 'url(#emagWireNeutral)'}
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Right wire */}
            <path
              d={`M ${coilEndX} 170 L ${coilEndX} 242 L 232 242`}
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
                  const leftY = 170 + offset * 72;
                  const rightY = 170 + (1 - offset) * 72;
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
                d="M -12 -36 L -8 -36 L -4 -36 L 0 -36 L 4 -36 L 8 -36 L 12 -36 L 12 -24 L 12 -12 L 12 0 L 12 12 L 12 24 L 12 36 L 8 36 L 4 36 L 0 36 L -4 36 L -8 36 L -8 24 L -8 12 L -8 0 L -8 -12 L -4 -12 L 0 -12 L 4 -12 L 8 -12"
                fill="none"
                stroke={clip.attracted ? 'url(#emagClipAttracted)' : 'url(#emagClipMetal)'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {clip.attracted && (
                <circle cx="0" cy="0" r="18" fill="url(#emagFieldGlow)" opacity="0.5" />
              )}
            </g>
          ))}

          {/* Info panels with premium gradient */}
          <g>
            {/* Field strength panel */}
            <rect x="15" y="15" width="110" height="55" rx="8" fill="url(#emagPanelGrad)" stroke="#374151" strokeWidth="1.5" />
            <rect x="15" y="15" width="110" height="55" rx="8" fill="none" stroke="white" strokeWidth="0.5" opacity="0.1" />
            <text x="70" y="35" textAnchor="middle" fill="#9ca3af" fontSize="11">Field Strength</text>
            <text x="70" y="55" textAnchor="middle" fill="#a855f7" fontSize="16" fontWeight="bold">
              {fieldStrength.toFixed(2)} T
            </text>

            {/* Polarity panel */}
            <rect x="275" y="15" width="110" height="55" rx="8" fill="url(#emagPanelGrad)" stroke="#374151" strokeWidth="1.5" />
            <rect x="275" y="15" width="110" height="55" rx="8" fill="none" stroke="white" strokeWidth="0.5" opacity="0.1" />
            <text x="330" y="35" textAnchor="middle" fill="#9ca3af" fontSize="11">Polarity</text>
            <text x="330" y="55" textAnchor="middle" fill={curr === 0 ? '#6b7280' : curr > 0 ? '#3b82f6' : '#ef4444'} fontSize="16" fontWeight="bold">
              {polarity}
            </text>
          </g>

          {/* Grid lines for visual reference */}
          <line x1="140" y1="80" x2="260" y2="80" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
          <line x1="140" y1="140" x2="260" y2="140" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
          <line x1="140" y1="200" x2="260" y2="200" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />

          {/* Axis labels for current and field strength */}
          <text x="200" y="272" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11">Current (A)</text>

          {/* Interactive field strength indicator point */}
          {(() => {
            const normalizedCurrent = Math.abs(curr) / 5;
            const indicatorY = 250 - normalizedCurrent * 180;
            return (
              <circle
                cx="200"
                cy={indicatorY}
                r="10"
                fill="#a855f7"
                filter="url(#emagPoleGlow)"
                opacity="0.9"
              />
            );
          })()}

          {/* Field response curve showing B vs position */}
          {(() => {
            const nf = Math.abs(curr) / 5;
            const coreBoost = core ? 1.5 : 1;
            const amp = Math.min(nf * coreBoost, 1);
            const pts = [
              { x: 130, y: 250 - amp * 10 },
              { x: 142, y: 245 - amp * 25 },
              { x: 154, y: 235 - amp * 50 },
              { x: 166, y: 220 - amp * 80 },
              { x: 178, y: 200 - amp * 120 },
              { x: 190, y: 180 - amp * 145 },
              { x: 200, y: 170 - amp * 150 },
              { x: 210, y: 180 - amp * 145 },
              { x: 222, y: 200 - amp * 120 },
              { x: 234, y: 220 - amp * 80 },
              { x: 246, y: 235 - amp * 50 },
              { x: 258, y: 245 - amp * 25 },
              { x: 270, y: 250 - amp * 10 },
            ];
            const d = `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
            return (
              <path
                d={d}
                fill="none"
                stroke="#a855f7"
                strokeWidth="2"
                opacity="0.6"
              />
            );
          })()}
        </svg>
      </div>
    );
  };

  // ─── AC Motor Visualization ────────────────────────────────────────────────
  const renderACMotor = (curr: number, ac: boolean, phaseAngle: number) => {
    const effectiveCurrent = ac ? curr * Math.sin(phaseAngle) : curr;
    const rotorAngle = ac ? phaseAngle * 2 : 0;

    return (
      <div className="space-y-3">
        <svg viewBox="0 0 400 280" className="w-full h-56" preserveAspectRatio="xMidYMid meet">
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
            const isActive = ac ? Math.abs(Math.sin(phaseAngle + (i * Math.PI / 2))) > 0.5 : curr > 0;

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
              <path d="M 200 60 L 224 130 L 176 130 Z" fill="url(#emagNorthPole)" />
              <path d="M 200 60 L 224 130 L 176 130 Z" fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
              <text x="200" y="108" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">N</text>
            </g>

            {/* S pole with premium gradient */}
            <g filter="url(#emagPoleGlow)">
              <path d="M 200 220 L 224 150 L 176 150 Z" fill="url(#emagSouthPole)" />
              <path d="M 200 220 L 224 150 L 176 150 Z" fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
              <text x="200" y="178" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">S</text>
            </g>
          </g>

          {/* Shaft with metallic gradient */}
          <rect x="193" y="180" width="14" height="65" rx="2" fill="url(#emagCoreGrad)" stroke="#4b5563" strokeWidth="1" />

          {/* Info panels */}
          <g>
            {/* Current waveform panel */}
            <rect x="15" y="15" width="125" height="65" rx="8" fill="url(#emagPanelGrad)" stroke="#374151" strokeWidth="1.5" />
            <text x="77" y="32" textAnchor="middle" fill="#9ca3af" fontSize="11">Current Type</text>

            {/* Waveform visualization */}
            {ac ? (
              <path
                d={`M 25 52 ${[...Array(22)].map((_, i) => `L ${25 + i * 5} ${52 + Math.sin((i / 3.5) + phaseAngle) * 40}`).join(' ')}`}
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            ) : (
              <line x1="25" y1="52" x2="130" y2="52" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
            )}

            {/* Mode panel */}
            <rect x="260" y="15" width="125" height="65" rx="8" fill="url(#emagPanelGrad)" stroke="#374151" strokeWidth="1.5" />
            <text x="322" y="32" textAnchor="middle" fill="#9ca3af" fontSize="11">Motor Mode</text>
            <text x="322" y="55" textAnchor="middle" fill={ac ? '#22c55e' : '#fbbf24'} fontSize="14" fontWeight="bold">
              {ac ? 'AC ROTATING' : 'DC STATIC'}
            </text>
          </g>
        </svg>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERERS
  // ─────────────────────────────────────────────────────────────────────────────

  // PHASE 1: HOOK - Engaging introduction
  const renderHook = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '32px 24px' }}>
      <h1 style={{ fontSize: '36px', fontWeight: 700, textAlign: 'center', marginBottom: '12px', color: '#c084fc' }}>
        The Electromagnet
      </h1>

      <p style={{ color: '#94a3b8', fontSize: '18px', textAlign: 'center', marginBottom: '32px', maxWidth: '480px', fontWeight: 400 }}>
        How does electricity create magnetic force?
      </p>

      <div style={{ maxWidth: '420px', width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', marginBottom: '32px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧲</div>
          <p style={{ color: '#d1d5db', fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
            A junkyard crane lifts an entire <span style={{ color: '#facc15', fontWeight: 600 }}>2-ton car</span> using nothing but electricity flowing through wire coils.
          </p>
        </div>

        <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ color: '#93c5fd', fontWeight: 500, textAlign: 'center' }}>
            How can invisible electric current create such powerful magnetic force?
          </p>
        </div>

        <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', fontWeight: 400 }}>
          Discover the 200-year-old discovery that powers MRI machines, electric cars, and high-speed trains.
        </p>
      </div>

      <button
        onClick={() => goToPhase('predict')}
        style={{ padding: '14px 32px', background: 'linear-gradient(135deg, #9333ea, #3b82f6)', borderRadius: '12px', border: 'none', color: 'white', fontWeight: 600, fontSize: '16px', cursor: 'pointer', transition: 'all 0.3s ease' }}
      >
        Discover the Secret
      </button>

      <p style={{ color: '#64748b', fontSize: '14px', marginTop: '24px', fontWeight: 400 }}>
        Learn how electricity and magnetism are connected
      </p>
    </div>
  );

  // PHASE 2: PREDICT - User makes a prediction
  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A student wraps copper wire around an iron nail and connects it to a battery. What will happen when current flows through the wire?
        </p>

        {/* Simple diagram */}
        <svg width="300" height="120" className="mx-auto">
          <rect width="300" height="120" fill="#1e293b" rx="8" />
          {/* Battery */}
          <rect x="20" y="45" width="40" height="30" fill="#374151" stroke="#6b7280" strokeWidth="2" rx="3" />
          <text x="40" y="65" textAnchor="middle" fill="#9ca3af" fontSize="11">BATT</text>
          {/* Wire to nail */}
          <path d="M60,60 L100,60" fill="none" stroke="#ef4444" strokeWidth="3" />
          {/* Nail with coil */}
          <rect x="100" y="50" width="100" height="20" fill="#6b7280" rx="2" />
          {/* Coil representation */}
          {[0,1,2,3,4,5].map(i => (
            <ellipse key={i} cx={110 + i*15} cy="60" rx="6" ry="15" fill="none" stroke="#f59e0b" strokeWidth="2" />
          ))}
          {/* Wire back */}
          <path d="M200,60 L240,60 L240,90 L40,90 L40,75" fill="none" stroke="#3b82f6" strokeWidth="3" />
          {/* Question marks around nail */}
          <text x="150" y="35" textAnchor="middle" fill="#fbbf24" fontSize="18">???</text>
        </svg>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Nothing happens - wire is not magnetic' },
          { id: 'B', text: 'The nail becomes a magnet and can attract metal objects' },
          { id: 'C', text: 'The wire gets hot but nothing magnetic happens' },
          { id: 'D', text: 'The battery drains instantly due to a short circuit' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'B'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'B'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            {selectedPrediction === 'B' ? 'Correct!' : 'Not quite!'} Electric current flowing through wire creates a <span className="text-cyan-400">magnetic field</span>!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            This discovery by Hans Christian Oersted in 1820 revolutionized physics and technology.
          </p>
          <button
            onClick={() => goToPhase('play')}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all duration-300"
          >
            Build an Electromagnet
          </button>
        </div>
      )}
    </div>
  );

  // PHASE 3: PLAY - Interactive simulation
  const renderPlay = () => {
    const fieldStrength = calculateFieldStrength(Math.abs(current), coilTurns, hasCore);

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Electromagnet Lab</h2>

        {/* Key Concept Panel - Physics definition and real-world relevance */}
        <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', borderRadius: '12px', border: '1px solid #3b82f6', padding: '16px', marginBottom: '16px', maxWidth: '672px', width: '100%' }}>
          <p className="text-slate-200 text-sm">
            <strong className="text-cyan-400">Magnetic field strength</strong> is defined as the force experienced by a moving charge in a magnetic field and is measured in Tesla (T).
            The relationship between current, coil turns, and field strength is given by the formula: <span className="font-mono text-yellow-400">B = u x n x I</span>.
            This technology is important because electromagnets are used in MRI machines, electric motors, speakers, and industrial applications.
            Engineers design electromagnets for practical applications from medical imaging to maglev trains.
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
        }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
        <div className="bg-slate-800/50 rounded-2xl p-6 mb-4 w-full">
          {renderElectromagnet(current, coilTurns, hasCore, paperClipPositions)}
        </div>
        </div>

        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          {/* Controls */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-slate-700/50 rounded-xl p-4">
              <label className="text-sm text-yellow-400 mb-2 block font-medium">
                Current: {current.toFixed(1)} A
              </label>
              <input
                type="range"
                min="-5"
                max="5"
                step="0.5"
                value={current}
                onChange={(e) => {
                  setCurrent(Number(e.target.value));
                  onGameEvent?.({ type: 'current_changed', data: { current: Number(e.target.value) } });
                }}
                className="w-full accent-yellow-500"
                style={{ width: '100%', height: '20px', accentColor: '#3b82f6', cursor: 'pointer', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>-5A</span>
                <span>0</span>
                <span>+5A</span>
              </div>
            </div>

            <div className="bg-slate-700/50 rounded-xl p-4">
              <label className="text-sm text-orange-400 mb-2 block font-medium">
                Coil Turns: {coilTurns}
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={coilTurns}
                onChange={(e) => {
                  setCoilTurns(Number(e.target.value));
                  onGameEvent?.({ type: 'parameter_changed', data: { coilTurns: Number(e.target.value) } });
                }}
                className="w-full accent-orange-500"
                style={{ width: '100%', height: '20px', accentColor: '#3b82f6', cursor: 'pointer', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Iron Core Toggle */}
          <div className="flex justify-center mt-4">
            <button
              onClick={() => {
                playSound('click');
                setHasCore(!hasCore);
                onGameEvent?.({ type: 'parameter_changed', data: { hasCore: !hasCore } });
              }}
              className={`px-6 py-3 rounded-lg font-bold transition-all ${
                hasCore
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
              }`}
            >
              Iron Core: {hasCore ? 'ON (1000x boost!)' : 'OFF'}
            </button>
          </div>

          {/* Field strength indicator */}
          <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
            <p className="text-gray-300 text-center" style={{ fontSize: typo.body }}>
              Field Strength: <span className="text-purple-400 font-bold">{fieldStrength.toFixed(3)} T</span>
              {hasCore && fieldStrength > 0 && <span className="text-green-400 ml-2">(Iron amplifies 1000x!)</span>}
            </p>
          </div>
        </div>
        </div>

        {/* Instructions */}
        <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl mb-6">
          <h3 className="text-lg font-semibold text-cyan-400 mb-3">Try These Experiments:</h3>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex items-start gap-3">
              <div className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold">1</div>
              <p>Increase current - watch the field strength and paper clip attraction</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold">2</div>
              <p>Add more coil turns - how does this affect the magnetic field?</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold">3</div>
              <p>Toggle the iron core - observe the dramatic amplification!</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold">4</div>
              <p>Try negative current - what happens to the magnetic poles?</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => goToPhase('review')}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all duration-300"
        >
          Understand the Physics
        </button>
      </div>
    );
  };

  // PHASE 4: REVIEW - Explain the physics
  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Electromagnets</h2>

      {/* Connection to prediction */}
      <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 rounded-2xl p-4 mb-6 max-w-4xl border border-green-600/30">
        <p className="text-slate-200 text-sm">
          As you observed in the experiment, your prediction about current creating magnetism was correct!
          You saw that increasing current strengthens the field - this is exactly what the result of the simulation demonstrated.
          The observation you made confirms Oersted&apos;s discovery from 1820.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        {/* Oersted's Discovery */}
        <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-3">Oersted&apos;s Discovery (1820)</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>- Electric current creates a magnetic field around the wire</li>
            <li>- The field forms concentric circles around the wire</li>
            <li>- Coiling the wire concentrates the field inside the coil</li>
            <li>- This creates a "solenoid" - an electromagnet</li>
          </ul>
        </div>

        {/* The Math */}
        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">The Math: Solenoid Field</h3>
          <div className="space-y-2 text-slate-300 text-sm">
            <p className="font-mono bg-slate-800/50 p-3 rounded text-center text-lg">B = u * n * I</p>
            <ul className="mt-3 space-y-1">
              <li>- <span className="text-cyan-400">B</span> = Magnetic field strength (Tesla)</li>
              <li>- <span className="text-cyan-400">u</span> = Permeability (how "magnetic" the core is)</li>
              <li>- <span className="text-cyan-400">n</span> = Number of turns per unit length</li>
              <li>- <span className="text-cyan-400">I</span> = Electric current (Amperes)</li>
            </ul>
          </div>
        </div>

        {/* Three factors */}
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-4">Three Ways to Strengthen an Electromagnet</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center bg-slate-800/50 rounded-xl p-4">
              <div className="text-3xl mb-2">⚡</div>
              <h4 className="text-yellow-400 font-semibold mb-1">More Current</h4>
              <p className="text-slate-300">Double the current, double the field</p>
            </div>
            <div className="text-center bg-slate-800/50 rounded-xl p-4">
              <div className="text-3xl mb-2">🔄</div>
              <h4 className="text-orange-400 font-semibold mb-1">More Turns</h4>
              <p className="text-slate-300">Each turn adds to the total field</p>
            </div>
            <div className="text-center bg-slate-800/50 rounded-xl p-4">
              <div className="text-3xl mb-2">🧲</div>
              <h4 className="text-purple-400 font-semibold mb-1">Iron Core</h4>
              <p className="text-slate-300">Amplifies field by ~1000x!</p>
            </div>
          </div>
        </div>

        {/* Why Iron Helps */}
        <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-2xl p-6 md:col-span-2 border border-yellow-600/30">
          <h3 className="text-lg font-bold text-yellow-400 mb-2">Why Does Iron Amplify the Field?</h3>
          <p className="text-slate-300 text-sm">
            Iron is <span className="text-yellow-400 font-semibold">ferromagnetic</span> - its atoms act like tiny magnets.
            When placed in a magnetic field, these atomic magnets align with the external field,
            adding their own magnetic fields together. This "domain alignment" can amplify the
            field by a factor of 1000 or more! This is why electromagnets always use iron cores.
          </p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
      >
        Discover a Surprising Twist
      </button>
    </div>
  );

  // PHASE 5: TWIST_PREDICT - Second prediction
  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-pink-400 mb-6">The Motor Question</h2>

      {/* SVG diagram showing DC vs AC current concept */}
      <svg width="320" height="180" viewBox="0 0 320 180" style={{ marginBottom: 16 }} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="twpEmagCoil" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="twpEmagCore" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <filter id="twpEmagGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect width="320" height="180" rx="12" fill="#0f172a" />
        {/* DC side */}
        <text x="80" y="20" textAnchor="middle" fill="#eab308" fontSize="11" fontWeight="bold" fontFamily={theme.fontFamily}>DC (steady)</text>
        <rect x="40" y="55" width="80" height="20" rx="3" fill="url(#twpEmagCore)" />
        {[0,1,2,3].map(i => (
          <ellipse key={`dc-${i}`} cx={50 + i * 20} cy={65} rx="7" ry="16" fill="none" stroke="url(#twpEmagCoil)" strokeWidth="2" />
        ))}
        <text x="30" y="70" fill="#3b82f6" fontSize="12" fontWeight="bold" fontFamily={theme.fontFamily}>S</text>
        <text x="125" y="70" fill="#ef4444" fontSize="12" fontWeight="bold" fontFamily={theme.fontFamily}>N</text>
        <path d="M 30,65 C 30,15 130,15 130,65" fill="none" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="3,2" opacity="0.5" />
        <path d="M 30,65 C 30,115 130,115 130,65" fill="none" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="3,2" opacity="0.5" />
        {/* Arrow showing steady current */}
        <line x1="60" y1="100" x2="100" y2="100" stroke="#eab308" strokeWidth="2" />
        <polygon points="100,95 110,100 100,105" fill="#eab308" />
        <text x="80" y="115" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily={theme.fontFamily}>Fixed poles</text>
        {/* AC side */}
        <text x="240" y="20" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="bold" fontFamily={theme.fontFamily}>AC (alternating)</text>
        <rect x="200" y="55" width="80" height="20" rx="3" fill="url(#twpEmagCore)" />
        {[0,1,2,3].map(i => (
          <ellipse key={`ac-${i}`} cx={210 + i * 20} cy={65} rx="7" ry="16" fill="none" stroke="url(#twpEmagCoil)" strokeWidth="2" />
        ))}
        <text x="190" y="70" fill="#ef4444" fontSize="12" fontWeight="bold" fontFamily={theme.fontFamily}>N</text>
        <text x="285" y="70" fill="#3b82f6" fontSize="12" fontWeight="bold" fontFamily={theme.fontFamily}>S</text>
        <text x="240" y="50" fill="#22c55e" fontSize="14" fontFamily={theme.fontFamily}>???</text>
        {/* AC wave */}
        <path d="M 210,100 Q 220,55 230,100 Q 240,145 250,100 Q 260,55 270,100" fill="none" stroke="#22c55e" strokeWidth="2" />
        <text x="240" y="125" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily={theme.fontFamily}>Poles flip?</text>
        {/* Divider */}
        <line x1="160" y1="25" x2="160" y2="165" stroke="#334155" strokeWidth="1" strokeDasharray="4,4" />
        <text x="160" y="170" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily={theme.fontFamily}>vs</text>
      </svg>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          You&apos;ve built an electromagnet with steady DC current. The magnetic poles (N and S) stay fixed in place.
          But what if you could make the poles move?
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          If you rapidly switch the current direction back and forth (alternating current), what happens to the magnetic field?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The magnetic field disappears completely' },
          { id: 'B', text: 'The field stays the same - only strength matters' },
          { id: 'C', text: 'The magnetic poles flip back and forth (N becomes S, S becomes N)' },
          { id: 'D', text: 'The field becomes twice as strong' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'C'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            {twistPrediction === 'C' ? 'Exactly right!' : 'Not quite!'} Reversing current reverses the magnetic poles!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            This is the secret behind electric motors - a rotating magnetic field that makes things spin!
          </p>
          <button
            onClick={() => goToPhase('twist_play')}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
          >
            See Motors in Action
          </button>
        </div>
      )}
    </div>
  );

  // PHASE 6: TWIST_PLAY - Second interactive experiment
  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-pink-400 mb-4">AC vs DC: Making Motors Spin</h2>

      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
        maxWidth: '900px',
      }}>
      <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4 w-full">
        {renderACMotor(twistCurrent, isAC, acPhase)}
      </div>
      </div>

      <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
        {/* AC/DC Toggle */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => {
              playSound('click');
              setIsAC(false);
            }}
            className={`px-6 py-3 rounded-lg font-bold transition-all ${
              !isAC ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/30' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
            }`}
          >
            DC (Steady)
          </button>
          <button
            onClick={() => {
              playSound('buzz');
              setIsAC(true);
            }}
            className={`px-6 py-3 rounded-lg font-bold transition-all ${
              isAC ? 'bg-green-600 text-white shadow-lg shadow-green-500/30' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
            }`}
          >
            AC (Alternating)
          </button>
        </div>

        {/* Explanation */}
        <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
          <p className="text-gray-300 text-center" style={{ fontSize: typo.body }}>
            {isAC ? (
              <>
                <span className="text-green-400 font-bold">AC creates a rotating magnetic field!</span>
                <br />
                <span className="text-slate-400 text-sm">The rotor continuously chases the rotating field, causing smooth rotation.</span>
              </>
            ) : (
              <>
                <span className="text-yellow-400 font-bold">DC creates a static magnetic field.</span>
                <br />
                <span className="text-slate-400 text-sm">The rotor aligns with the field once, then stops. Real DC motors need commutators to keep spinning.</span>
              </>
            )}
          </p>
        </div>
      </div>
      </div>

      <button
        onClick={() => { setIsAC(false); goToPhase('twist_review'); }}
        className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
      >
        Understand Motor Physics
      </button>
    </div>
  );

  // PHASE 7: TWIST_REVIEW - Deep explanation
  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-pink-400 mb-6">How Electric Motors Work</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        {/* The Rotating Field Principle */}
        <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-green-400 mb-3">The Rotating Field Principle</h3>
          <p className="text-slate-300" style={{ fontSize: typo.body }}>
            <span className="text-yellow-400 font-bold">Reversing current reverses the magnetic poles.</span>{' '}
            By rapidly alternating current in multiple coils arranged in a circle, we create a magnetic field
            that appears to rotate. Any magnet placed inside will spin trying to follow this rotating field -
            this is the heart of every electric motor!
          </p>
        </div>

        {/* DC Motors */}
        <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-yellow-400 mb-3">DC Motors</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">+</span>
              <span>Simple speed control (vary voltage)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">+</span>
              <span>Work directly from batteries</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400">-</span>
              <span>Need brushes/commutator to switch current</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400">-</span>
              <span>Brushes wear out over time</span>
            </li>
          </ul>
          <p className="text-slate-400 text-xs mt-3">Used in: toys, power tools, car starters</p>
        </div>

        {/* AC Motors */}
        <div className="bg-gradient-to-br from-green-900/30 to-teal-900/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-green-400 mb-3">AC Motors</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-green-400">+</span>
              <span>No brushes needed - very reliable</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">+</span>
              <span>Grid power is already AC</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">+</span>
              <span>Higher efficiency, longer lifespan</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400">-</span>
              <span>Speed control requires inverters</span>
            </li>
          </ul>
          <p className="text-slate-400 text-xs mt-3">Used in: EVs, industrial machines, HVAC, appliances</p>
        </div>

        {/* Tesla's Legacy */}
        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-2xl p-6 md:col-span-2 border border-purple-600/30">
          <h3 className="text-lg font-bold text-purple-400 mb-2">Tesla&apos;s Revolution</h3>
          <p className="text-slate-300 text-sm">
            Nikola Tesla invented the <span className="text-purple-400 font-semibold">AC induction motor</span> in 1887.
            It&apos;s called "induction" because the rotating stator field induces currents in the rotor,
            making it magnetic without any electrical connection! This elegant design has no brushes
            to wear out, making it incredibly reliable. Tesla&apos;s motors now power everything from
            washing machines to Tesla electric vehicles.
          </p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all duration-300"
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  // PHASE 8: TRANSFER - 4 detailed real-world applications
  const renderTransfer = () => {
    const currentApp = realWorldApps[activeAppTab];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', overflowY: 'auto' }}>
        <h2 className="text-2xl font-bold text-white mb-2">Real-World Applications</h2>
        <p className="text-slate-400 mb-6">Explore how electromagnets power our world</p>

        {/* App tabs */}
        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          {realWorldApps.map((app, index) => (
            <button
              key={index}
              onClick={() => setActiveAppTab(index)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeAppTab === index
                  ? 'text-white shadow-lg'
                  : completedApps.has(index)
                  ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              style={activeAppTab === index ? { backgroundColor: currentApp.color, borderRadius: '8px' } : { borderRadius: '8px' }}
            >
              {app.icon} {app.title.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* App content card */}
        <div style={{ borderRadius: '16px', padding: '24px', maxWidth: '768px', width: '100%', background: 'rgba(30,41,59,0.5)' }}>
          {/* Header */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{currentApp.icon}</span>
            <div>
              <h3 className="text-2xl font-bold text-white">{currentApp.title}</h3>
              <p className="text-slate-400">{currentApp.tagline}</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-slate-300 mb-4">{currentApp.description}</p>

          {/* Connection to lesson */}
          <div style={{ borderRadius: '12px', padding: '16px', marginBottom: '16px', background: 'rgba(88,28,135,0.3)', border: '1px solid rgba(147,51,234,0.3)' }}>
            <h4 className="text-purple-400 font-semibold mb-1">Connection to What You Learned:</h4>
            <p className="text-slate-300 text-sm">{currentApp.connection}</p>
          </div>

          {/* How it works */}
          <div style={{ borderRadius: '12px', padding: '16px', marginBottom: '16px', background: 'rgba(51,65,85,0.5)' }}>
            <h4 className="text-cyan-400 font-semibold mb-1">How It Works:</h4>
            <p className="text-slate-300 text-sm">{currentApp.howItWorks}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {currentApp.stats.map((stat, i) => (
              <div key={i} className="bg-slate-700/50 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-lg font-bold" style={{ color: currentApp.color }}>{stat.value}</div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Examples */}
          <div className="mb-4">
            <h4 className="text-slate-400 text-sm font-semibold mb-2">Real Examples:</h4>
            <div className="flex flex-wrap gap-2">
              {currentApp.examples.map((example, i) => (
                <span key={i} className="px-3 py-1 bg-slate-700/50 rounded-full text-sm text-slate-300">
                  {example}
                </span>
              ))}
            </div>
          </div>

          {/* Companies */}
          <div className="mb-4">
            <h4 className="text-slate-400 text-sm font-semibold mb-2">Key Companies:</h4>
            <div className="flex flex-wrap gap-2">
              {currentApp.companies.map((company, i) => (
                <span key={i} className="px-3 py-1 bg-blue-900/30 border border-blue-600/30 rounded-full text-sm text-blue-300">
                  {company}
                </span>
              ))}
            </div>
          </div>

          {/* Future impact */}
          <div style={{ borderRadius: '12px', padding: '16px', marginBottom: '16px', background: 'rgba(20,83,45,0.3)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <h4 className="text-green-400 font-semibold mb-1">Future Impact:</h4>
            <p className="text-slate-300 text-sm">{currentApp.futureImpact}</p>
          </div>

          {/* Mark as understood */}
          {!completedApps.has(activeAppTab) && (
            <button
              onClick={() => handleAppComplete(activeAppTab)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors"
            >
              Mark as Understood
            </button>
          )}
          {completedApps.has(activeAppTab) && (
            <div className="text-center text-emerald-400 py-3 font-semibold">
              Completed!
            </div>
          )}
        </div>

        {/* Numeric stats summary */}
        <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(30,41,59,0.5)', borderRadius: '12px', maxWidth: '640px', width: '100%' }}>
          <p style={{ color: 'rgba(148,163,184,1)', fontSize: '13px', lineHeight: 1.7, fontWeight: 400 }}>
            Electromagnets are used in over 40000 MRI machines worldwide generating fields of 7 Tesla for medical imaging.
            Maglev trains achieve speeds of 603 km/h with a levitation gap of just 10mm.
            Electric motors consume 50% of global electricity with 95% peak efficiency and represent a $150B market.
            Industrial lifting magnets can lift 20000 kg using 500 A of current at 4 Tesla field strength.
            Superconducting magnets at the LHC carry 11000 A at 1.9 Kelvin to bend particles in a 27 km ring.
          </p>
        </div>

        {/* Progress */}
        <div className="mt-6 flex items-center gap-3">
          <span className="text-slate-400">Progress:</span>
          <div className="flex gap-1">
            {realWorldApps.map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all ${
                  completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
          <span className="text-slate-400">{completedApps.size}/4</span>
        </div>

        {completedApps.size >= 4 && (
          <button
            onClick={() => goToPhase('test')}
            className="mt-6 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all duration-300"
          >
            Take the Knowledge Test
          </button>
        )}
      </div>
    );
  };

  // PHASE 9: TEST - 10 scenario-based questions with explanations
  const renderTest = () => {
    const q = testQuestions[currentQuestionIdx];
    const selectedAnswer = testAnswers[currentQuestionIdx];
    const isConfirmed = confirmedIndex !== null && confirmedIndex === currentQuestionIdx;
    const totalAnswered = testAnswers.filter(a => a !== -1).length;

    if (testSubmitted) {
      const score = calculateScore();
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Knowledge Assessment</h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px', fontWeight: 400 }}>Electromagnet physics mastery test covering core concepts and real-world applications</p>
          <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>{score >= 7 ? '🏆' : '📚'}</div>
            <h3 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Score: {score}/{testQuestions.length}</h3>
            <p style={{ color: '#cbd5e1', marginBottom: '24px', fontWeight: 400 }}>
              {score >= 7 ? 'Excellent! You have mastered electromagnet physics!' : 'Keep studying! Review the concepts and try again.'}
            </p>
            <button
              onClick={() => { if (score >= 7) { goToPhase('mastery'); } else { setTestSubmitted(false); setTestAnswers(Array(10).fill(-1)); setCurrentQuestionIdx(0); setConfirmedIndex(null); goToPhase('review'); } }}
              style={{ padding: '12px 32px', background: score >= 7 ? 'linear-gradient(135deg, #059669, #0d9488)' : 'linear-gradient(135deg, #9333ea, #3b82f6)', borderRadius: '12px', border: 'none', color: 'white', fontWeight: 600, fontSize: '16px', cursor: 'pointer' }}
            >
              {score >= 7 ? 'Claim Your Mastery Badge' : 'Review and Try Again'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Knowledge Assessment</h2>
        <p style={{ color: '#94a3b8', marginBottom: '24px', fontWeight: 400 }}>Electromagnet physics mastery test covering core concepts and real-world applications of electromagnetic force, field strength, motors, superconductors, and practical engineering</p>

        {/* Progress */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          {testQuestions.map((_, i) => (
            <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: testAnswers[i] !== -1 ? (testQuestions[i].options[testAnswers[i]]?.correct ? '#22c55e' : '#ef4444') : i === currentQuestionIdx ? '#a855f7' : '#334155', transition: 'all 0.3s' }} />
          ))}
        </div>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Question {currentQuestionIdx + 1} of {testQuestions.length}</p>

        {/* Current question */}
        <div style={{ maxWidth: '640px', width: '100%', background: 'rgba(30,41,59,0.5)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ background: 'rgba(51,65,85,0.5)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
            <p style={{ color: '#94a3b8', fontSize: '14px', fontStyle: 'italic', fontWeight: 400 }}>{q.scenario}</p>
          </div>
          <p style={{ color: 'white', fontWeight: 500, marginBottom: '16px' }}>
            <span style={{ color: '#a855f7', fontWeight: 700, marginRight: '8px' }}>Q{currentQuestionIdx + 1}.</span>
            {q.question}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {q.options.map((option, oIndex) => {
              const isSelected = selectedAnswer === oIndex;
              const showResult = isConfirmed;
              const isCorrect = option.correct;
              let bg = 'rgba(51,65,85,0.5)';
              let border = '2px solid transparent';
              if (showResult && isSelected) {
                bg = isCorrect ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)';
                border = isCorrect ? '2px solid #22c55e' : '2px solid #ef4444';
              } else if (showResult && isCorrect) {
                bg = 'rgba(34,197,94,0.15)';
                border = '1px solid rgba(34,197,94,0.5)';
              } else if (isSelected && !showResult) {
                bg = 'rgba(168,85,247,0.3)';
                border = '2px solid #a855f7';
              }
              return (
                <button
                  key={oIndex}
                  onClick={() => { if (!isConfirmed) handleTestAnswer(currentQuestionIdx, oIndex); }}
                  disabled={isConfirmed}
                  style={{ padding: '12px', borderRadius: '8px', textAlign: 'left', fontSize: '14px', background: bg, border, color: 'white', cursor: isConfirmed ? 'default' : 'pointer', transition: 'all 0.2s' }}
                >
                  {String.fromCharCode(65 + oIndex)}) {option.text}
                </button>
              );
            })}
          </div>

          {isConfirmed && (
            <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(30,58,138,0.3)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px' }}>
              <p style={{ color: '#93c5fd', fontSize: '14px', fontWeight: 400 }}>
                <span style={{ fontWeight: 600 }}>Explanation: </span>{q.explanation}
              </p>
            </div>
          )}

          {/* Action button */}
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
            {!isConfirmed && selectedAnswer !== -1 && (
              <button
                onClick={() => setConfirmedIndex(currentQuestionIdx)}
                style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #a855f7, #3b82f6)', borderRadius: '10px', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}
              >
                Check Answer
              </button>
            )}
            {isConfirmed && currentQuestionIdx < testQuestions.length - 1 && (
              <button
                onClick={() => { setCurrentQuestionIdx(currentQuestionIdx + 1); setConfirmedIndex(null); }}
                style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #a855f7, #3b82f6)', borderRadius: '10px', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}
              >
                Next Question
              </button>
            )}
            {isConfirmed && currentQuestionIdx === testQuestions.length - 1 && (
              <button
                onClick={() => {
                  const score = calculateScore();
                  setTestScore?.(score);
                  setTestSubmitted(true);
                  onGameEvent?.({ type: 'game_completed', details: { score: testScore, total: testQuestions.length } });
                  setShowTestResults(true);
                  playSound(score >= 7 ? 'complete' : 'incorrect');
                  onGameEvent?.({ type: 'test_completed', data: { score, total: testQuestions.length } });
                }}
                style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #059669, #0d9488)', borderRadius: '10px', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // PHASE 10: MASTERY - Completion celebration
  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-purple-900/50 via-blue-900/50 to-cyan-900/50 rounded-3xl p-8 max-w-2xl">
        {/* Trophy */}
        <div className="text-8xl mb-6">🏆</div>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
          Electromagnet Master!
        </h1>

        <p className="text-xl text-slate-300 mb-6">
          Congratulations! You&apos;ve mastered the physics of electromagnets!
        </p>

        {/* Skills mastered */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-sm text-slate-300">Current Creates Fields</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔄</div>
            <p className="text-sm text-slate-300">Coils Concentrate Fields</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🧲</div>
            <p className="text-sm text-slate-300">Iron Amplifies 1000x</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔁</div>
            <p className="text-sm text-slate-300">AC Creates Rotating Fields</p>
          </div>
        </div>

        {/* Key insight */}
        <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-xl p-4 mb-6 border border-purple-600/30">
          <p className="text-purple-300 font-medium">
            Key Insight: Electromagnets are switchable magnets - control current, control magnetism!
          </p>
        </div>

        <p className="text-slate-400 mb-6">
          You now understand the technology behind MRI machines, electric vehicles,
          maglev trains, and industrial cranes. This same physics applies to
          speakers, hard drives, and countless other devices!
        </p>

        {/* Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              // Reset all state
              setShowPredictionFeedback(false);
              setSelectedPrediction(null);
              setTwistPrediction(null);
              setShowTwistFeedback(false);
              setTestAnswers(Array(10).fill(-1));
              setShowTestResults(false);
              setCompletedApps(new Set());
              setActiveAppTab(0);
              goToPhase('hook');
            }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            Explore Again
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Phase Router ──────────────────────────────────────────────────────────
  const renderPhase = () => {
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
          conceptName="Electromagnet"
          applications={realWorldApps}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          colors={colors}
          typo={typo}
          playSound={playSound}
          />
        );
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  const currentPhaseIndex = phaseOrder.indexOf(phase);

  // ─── Main Render ───────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0a0f1a 0%, #1a1a2e 50%, #0a0f1a 100%)', color: 'white', fontFamily: theme.fontFamily, minHeight: '100dvh' }}>
      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: `${((currentPhaseIndex + 1) / phaseOrder.length) * 100}%`, height: '3px', background: 'linear-gradient(90deg, #a855f7, #3b82f6)', zIndex: 60, transition: 'width 0.5s ease' }} />

      {/* Top bar */}
      <div style={{ flexShrink: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(10,15,26,0.9)' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>Electromagnet</span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {phaseOrder.map((p, index) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              aria-label={phaseLabels[p]}
              title={phaseLabels[p]}
              style={{
                width: p === phase ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: index <= currentPhaseIndex ? '#a855f7' : '#334155',
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: '12px', color: '#64748b' }}>{phaseLabels[phase]}</span>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        {renderPhase()}
      </div>

      {/* Bottom bar with Back/Next */}
      <div style={{ flexShrink: 0, padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(10,15,26,0.95)' }}>
        <button
          onClick={() => { if (currentPhaseIndex > 0) goToPhase(phaseOrder[currentPhaseIndex - 1]); }}
          style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: currentPhaseIndex > 0 ? 'white' : 'rgba(255,255,255,0.3)', cursor: currentPhaseIndex > 0 ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 500, opacity: currentPhaseIndex > 0 ? 1 : 0.4 }}
          disabled={currentPhaseIndex === 0}
        >
          Back
        </button>
        <span style={{ fontSize: '12px', color: '#64748b' }}>{currentPhaseIndex + 1} / {phaseOrder.length}</span>
        <button
          onClick={() => { if (currentPhaseIndex < phaseOrder.length - 1) goToPhase(phaseOrder[currentPhaseIndex + 1]); }}
          style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: currentPhaseIndex < phaseOrder.length - 1 ? 'linear-gradient(135deg, #a855f7, #3b82f6)' : 'rgba(255,255,255,0.1)', color: 'white', cursor: currentPhaseIndex < phaseOrder.length - 1 ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 500, opacity: currentPhaseIndex < phaseOrder.length - 1 ? 1 : 0.4 }}
          disabled={currentPhaseIndex === phaseOrder.length - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}
