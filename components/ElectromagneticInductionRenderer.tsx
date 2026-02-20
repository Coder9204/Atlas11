'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ════════════════════════════════════════════════════════════════════════════
// ELECTROMAGNETIC INDUCTION - Faraday's Law and Lenz's Law
// Complete 10-Phase Interactive Learning Experience
// ════════════════════════════════════════════════════════════════════════════
// Core Physics:
// - Faraday's Law: EMF = -dΦ/dt (induced EMF equals negative rate of flux change)
// - Magnetic Flux: Φ = B × A × cos(θ) (field × area × angle factor)
// - Lenz's Law: Induced current opposes the change that created it
// - Motional EMF: EMF = BLv (for conductor moving through field)
// ════════════════════════════════════════════════════════════════════════════

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

interface ElectromagneticInductionRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete' | 'buzz') => {
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
      buzz: { freq: 120, duration: 0.2, type: 'sawtooth' }
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

// ════════════════════════════════════════════════════════════════════════════
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ════════════════════════════════════════════════════════════════════════════
const testQuestions = [
  {
    scenario: "A lab technician moves a bar magnet quickly toward a coil of wire connected to a galvanometer. The needle deflects to the right.",
    question: "What happens to the galvanometer when the magnet is pulled away at the same speed?",
    options: [
      { id: 'a', label: "The needle stays in the center" },
      { id: 'b', label: "The needle deflects to the left (opposite direction)", correct: true },
      { id: 'c', label: "The needle deflects further to the right" },
      { id: 'd', label: "The galvanometer breaks from the reversed current" }
    ],
    explanation: "Lenz's Law tells us the induced current opposes the change in flux. Moving the magnet toward the coil increases flux, inducing current in one direction. Moving it away decreases flux, inducing current in the opposite direction."
  },
  {
    scenario: "An engineer designs two generators with identical coils but different rotation speeds. Generator A spins at 60 Hz and Generator B at 30 Hz.",
    question: "How do their induced EMFs compare (assuming same magnetic field)?",
    options: [
      { id: 'a', label: "Generator A produces twice the EMF", correct: true },
      { id: 'b', label: "Both produce the same EMF" },
      { id: 'c', label: "Generator B produces twice the EMF" },
      { id: 'd', label: "Generator A produces four times the EMF" }
    ],
    explanation: "EMF = -N(dΦ/dt). Faster rotation means flux changes more rapidly (higher dΦ/dt), directly proportional to frequency. Double the speed means double the rate of flux change, hence double the EMF."
  },
  {
    scenario: "A physics student wraps 100 turns of wire around an iron core and 50 turns around another identical core, connecting both to separate light bulbs.",
    question: "When exposed to the same changing magnetic field, which bulb glows brighter?",
    options: [
      { id: 'a', label: "The 50-turn coil's bulb glows brighter" },
      { id: 'b', label: "Both glow equally bright" },
      { id: 'c', label: "The 100-turn coil's bulb glows brighter", correct: true },
      { id: 'd', label: "Neither glows - iron cores block induction" }
    ],
    explanation: "EMF = -N(dΦ/dt) shows that induced voltage is directly proportional to the number of turns (N). The 100-turn coil produces twice the EMF, delivering more power to its bulb."
  },
  {
    scenario: "A wireless phone charger uses a coil in the base that carries alternating current. A phone with a receiver coil is placed on top.",
    question: "Why does the phone charge even though no wires connect them?",
    options: [
      { id: 'a', label: "The charger sends radio waves that carry energy" },
      { id: 'b', label: "Static electricity jumps between the devices" },
      { id: 'c', label: "The changing magnetic field from the base coil induces current in the phone's coil", correct: true },
      { id: 'd', label: "Heat conduction transfers the energy" }
    ],
    explanation: "Wireless charging uses electromagnetic induction. The alternating current in the base creates a changing magnetic field, which passes through the phone's coil and induces an alternating current that charges the battery."
  },
  {
    scenario: "An aluminum ring sits on a table above an electromagnet. When AC current flows through the electromagnet, the ring hovers in the air.",
    question: "What causes the ring to levitate?",
    options: [
      { id: 'a', label: "The ring becomes magnetized and is attracted upward" },
      { id: 'b', label: "Hot air from the electromagnet pushes the ring up" },
      { id: 'c', label: "Induced currents in the ring create an opposing magnetic field that repels it", correct: true },
      { id: 'd', label: "Electric charge on the ring is repelled by the coil" }
    ],
    explanation: "The changing magnetic field induces eddy currents in the aluminum ring (Faraday's Law). By Lenz's Law, these currents create a magnetic field that opposes the change, resulting in a repulsive force that levitates the ring."
  },
  {
    scenario: "A transformer has 500 turns on its primary coil and 50 turns on its secondary coil. The input voltage is 120V AC.",
    question: "What is the output voltage?",
    options: [
      { id: 'a', label: "1200V (step-up transformer)" },
      { id: 'b', label: "12V (step-down transformer)", correct: true },
      { id: 'c', label: "120V (voltage unchanged)" },
      { id: 'd', label: "600V (proportional to turn difference)" }
    ],
    explanation: "Transformer voltage ratio equals the turns ratio: V2/V1 = N2/N1. So V2 = 120V × (50/500) = 12V. With 10x fewer turns on the secondary, we get 1/10 the voltage (step-down transformer)."
  },
  {
    scenario: "A metal detector at an airport security checkpoint beeps when a passenger walks through carrying a set of keys.",
    question: "What electromagnetic principle makes the metal detector work?",
    options: [
      { id: 'a', label: "Metal objects block radio waves" },
      { id: 'b', label: "Metal objects are naturally magnetic" },
      { id: 'c', label: "Metal objects disturb the detector's magnetic field, changing induced currents", correct: true },
      { id: 'd', label: "Metal objects emit their own electromagnetic signals" }
    ],
    explanation: "Metal detectors use electromagnetic induction. They create an oscillating magnetic field that induces eddy currents in metal objects. These currents create their own magnetic fields that the detector senses as a change in its receiving coil."
  },
  {
    scenario: "An induction cooktop heats a steel pan placed on it, but doesn't heat a glass bowl placed in the same spot.",
    question: "Why does only the steel pan heat up?",
    options: [
      { id: 'a', label: "Steel is a better conductor of heat from the cooktop surface" },
      { id: 'b', label: "Glass reflects the heat waves while steel absorbs them" },
      { id: 'c', label: "Eddy currents are induced in the steel, causing resistive heating; glass is non-conductive", correct: true },
      { id: 'd', label: "The cooktop only activates when it detects magnetic materials" }
    ],
    explanation: "Induction cooktops create a rapidly changing magnetic field. This induces eddy currents in conductive materials like steel, which heat up due to electrical resistance. Glass doesn't conduct electricity, so no currents are induced and no heating occurs."
  },
  {
    scenario: "A student drops a strong magnet through a copper pipe and notices it falls much slower than expected.",
    question: "What causes this 'magnetic braking' effect?",
    options: [
      { id: 'a', label: "Air pressure builds up inside the pipe" },
      { id: 'b', label: "Induced eddy currents create opposing magnetic fields that resist the magnet's motion", correct: true },
      { id: 'c', label: "The magnet sticks to the copper through static electricity" },
      { id: 'd', label: "Copper is naturally magnetic and attracts the falling magnet" }
    ],
    explanation: "As the magnet falls, it creates a changing flux through the copper pipe, inducing eddy currents. By Lenz's Law, these currents create magnetic fields that oppose the magnet's motion (the change in flux), acting as a brake."
  },
  {
    scenario: "A power company transmits electricity at 500,000V instead of the 120V used in homes, using transformers at both ends.",
    question: "Why use such high voltage for transmission?",
    options: [
      { id: 'a', label: "High voltage travels faster through wires" },
      { id: 'b', label: "High voltage, low current reduces I squared R power losses in transmission lines", correct: true },
      { id: 'c', label: "High voltage is safer in case of accidents" },
      { id: 'd', label: "Transformers only work at high voltages" }
    ],
    explanation: "Power loss in wires = I squared R. For the same power (P = VI), higher voltage means lower current, dramatically reducing losses. Transformers (using electromagnetic induction) step voltage up for transmission and back down for safe home use."
  }
];

// ════════════════════════════════════════════════════════════════════════════
// REAL WORLD APPLICATIONS - 4 detailed applications
// ════════════════════════════════════════════════════════════════════════════
const realWorldApps = [
  {
    icon: '⚡',
    title: 'Electric Power Generators',
    short: 'Power Generation',
    tagline: 'Converting motion into electricity',
    description: 'Every power plant on Earth - from massive hydroelectric dams to nuclear facilities to wind farms - relies on electromagnetic induction to convert mechanical rotation into electrical current. Generators contain coils of wire rotating within powerful magnetic fields, creating the changing magnetic flux that induces electromotive force. This fundamental principle, discovered by Faraday in 1831, powers our entire modern electrical grid and generates over 28,000 terawatt-hours of electricity globally each year.',
    connection: 'Faraday\'s Law (EMF = -dΦ/dt) is the heart of every generator. As coils rotate through magnetic fields, the continuously changing flux induces alternating current. The negative sign in Faraday\'s Law, representing Lenz\'s Law, explains why generators require mechanical input - the induced current creates opposing forces that must be overcome.',
    howItWorks: 'Mechanical energy (water, steam, wind) rotates a shaft connected to the rotor. The rotor contains electromagnets or permanent magnets creating a strong magnetic field. Stationary stator coils surrounding the rotor experience changing magnetic flux as the rotor spins. The changing flux induces AC voltage in the stator windings according to Faraday\'s Law.',
    stats: [
      { value: '28,000 TWh', label: 'Global electricity annually', icon: '⚡' },
      { value: '99.5%', label: 'Peak generator efficiency', icon: '📊' },
      { value: '3,600 RPM', label: 'Typical turbine speed for 60Hz', icon: '🔄' }
    ],
    examples: ['Three Gorges Dam producing 22,500 MW from 32 turbines', 'Nuclear plant steam turbines generating 1,000+ MW each', 'Offshore wind turbines with 15 MW direct-drive generators', 'Portable gasoline generators for emergency backup'],
    companies: ['GE Vernova', 'Siemens Energy', 'Vestas', 'Hitachi Energy', 'ABB'],
    futureImpact: 'Superconducting generators using zero-resistance coils could boost efficiency by 50% while dramatically reducing size and weight. Direct-drive generators eliminate mechanical gearboxes in wind turbines, improving reliability. Fusion power plants will use advanced induction systems to harness plasma energy.',
    color: '#F59E0B'
  },
  {
    icon: '📱',
    title: 'Wireless Charging Technology',
    short: 'Wireless Power',
    tagline: 'Power through thin air',
    description: 'Wireless charging has revolutionized how we power our devices, eliminating tangled cables and worn-out connectors. Using electromagnetic induction, a transmitter coil in the charging pad creates an oscillating magnetic field that induces current in a receiver coil inside your phone or smartwatch. The Qi standard, now used by billions of devices worldwide, transfers up to 15W for phones and 50W for laptops. This same principle scales up to wirelessly charge electric vehicles with 11kW or more.',
    connection: 'Wireless charging is mutual induction in action - the same principle as a transformer. The transmitter coil acts as the primary, creating changing magnetic flux that links to the receiver (secondary) coil. Faraday\'s Law determines the induced voltage, while careful coil design and frequency selection (typically 100-200 kHz) maximize power transfer efficiency.',
    howItWorks: 'Transmitter coil receives AC power and generates an oscillating magnetic field. Receiver coil in the device captures the changing magnetic flux. Induced AC voltage in receiver is rectified to DC for battery charging. Communication between coils adjusts power level for optimal charging.',
    stats: [
      { value: '2.5B+', label: 'Qi-enabled devices shipped', icon: '📱' },
      { value: '93%', label: 'Maximum transfer efficiency', icon: '📊' },
      { value: '15W', label: 'Standard phone charging', icon: '⚡' }
    ],
    examples: ['iPhone and Android Qi wireless charging pads', 'Apple Watch magnetic inductive charger', 'Wireless charging electric toothbrush bases', 'BMW and Mercedes wireless EV charging systems'],
    companies: ['Apple', 'Samsung', 'Belkin', 'Anker', 'WiTricity'],
    futureImpact: 'Resonant wireless charging will enable room-scale power transfer, charging devices anywhere in a room without precise alignment. Dynamic wireless charging embedded in roads could power EVs while driving, eliminating range anxiety. Medical implants will use wireless inductive charging.',
    color: '#3B82F6'
  },
  {
    icon: '🍳',
    title: 'Induction Cooktops',
    short: 'Induction Cooking',
    tagline: 'Heat that stays in the pan',
    description: 'Induction cooktops represent the most efficient cooking technology ever developed, using electromagnetic induction to heat cookware directly while the cooktop surface stays cool. A high-frequency alternating current (20-100 kHz) flows through a coil beneath the ceramic surface, creating a rapidly changing magnetic field. When ferromagnetic cookware is placed on top, eddy currents are induced in the pan bottom, generating heat through electrical resistance (I squared R heating).',
    connection: 'Induction cooking demonstrates Faraday\'s Law and eddy current heating simultaneously. The high-frequency changing field induces circulating currents in the conductive pan material. By Lenz\'s Law, these currents also create a slight repulsive force. The pan\'s electrical resistance converts the induced currents into heat - the energy ultimately comes from the wall outlet through the magnetic coupling.',
    howItWorks: 'Coil under ceramic surface carries high-frequency AC (20-100 kHz). Changing magnetic field penetrates into ferromagnetic pan bottom. Eddy currents are induced in the metal, generating I squared R heating. Pan heats directly while cooktop surface stays relatively cool.',
    stats: [
      { value: '90%', label: 'Energy transfer efficiency', icon: '📊' },
      { value: '2-3x', label: 'Faster than gas or electric', icon: '⏱️' },
      { value: '84%', label: 'Less energy than gas stoves', icon: '🌱' }
    ],
    examples: ['Professional restaurant kitchens worldwide', 'Home induction ranges and cooktops', 'Portable single-burner induction units', 'Industrial heating and melting processes'],
    companies: ['Bosch', 'Miele', 'GE Appliances', 'Thermador', 'Samsung'],
    futureImpact: 'Flexible induction zones that heat any pan placement, integration with smart home systems for precise temperature control, and expanded compatibility with all cookware types through advanced frequency modulation.',
    color: '#EF4444'
  },
  {
    icon: '🚄',
    title: 'Electromagnetic Braking',
    short: 'Eddy Current Brakes',
    tagline: 'Friction-free stopping power',
    description: 'High-speed trains, roller coasters, and industrial machinery use electromagnetic braking systems that never wear out because there\'s no physical contact. When a conductor moves through a magnetic field (or a magnetic field moves past a conductor), eddy currents are induced. By Lenz\'s Law, these currents create magnetic fields that oppose the relative motion, producing a braking force proportional to speed. This elegant application of induction provides smooth, reliable, maintenance-free braking.',
    connection: 'Electromagnetic braking is a direct demonstration of Lenz\'s Law - the induced currents always oppose the change (motion) that created them. As the conductor moves through the field, the induced eddy currents create a magnetic field that resists the motion. The faster the motion, the greater the rate of flux change, and the stronger the braking force.',
    howItWorks: 'Electromagnets are activated near a conducting rail or disk. Relative motion induces eddy currents in the conductor. These currents create magnetic fields opposing the motion (Lenz\'s Law). The opposing force slows the vehicle without physical contact or wear.',
    stats: [
      { value: '320 km/h', label: 'Maximum braking speed', icon: '🚄' },
      { value: '0.3g', label: 'Typical deceleration', icon: '📉' },
      { value: 'Infinite', label: 'Brake pad lifespan', icon: '♾️' }
    ],
    examples: ['Shinkansen bullet train emergency braking', 'Roller coaster magnetic fin brakes', 'Heavy truck electromagnetic retarders', 'Industrial conveyor and crane stops'],
    companies: ['Knorr-Bremse', 'INTAMIN', 'Telma', 'Hitachi Rail', 'Wabtec'],
    futureImpact: 'Regenerative electromagnetic braking in hyperloop pods could recapture kinetic energy. Smart braking systems adapt force in real-time for optimal passenger comfort. Maglev trains use similar principles for both propulsion and contactless braking.',
    color: '#8B5CF6'
  }
];

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
const ElectromagneticInductionRenderer: React.FC<ElectromagneticInductionRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [magnetPosition, setMagnetPosition] = useState(0); // -100 to 100 (relative to coil)
  const [magnetVelocity, setMagnetVelocity] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [fieldStrength, setFieldStrength] = useState(1.0); // Tesla (normalized)
  const [coilTurns, setCoilTurns] = useState(50);
  const [inducedEMF, setInducedEMF] = useState(0);
  const [fluxHistory, setFluxHistory] = useState<number[]>([]);
  const [showFieldLines, setShowFieldLines] = useState(true);

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
  const animationRef = useRef<number | null>(null);
  const lastFluxRef = useRef(0);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate magnetic flux through the coil
  const calculateFlux = useCallback((pos: number) => {
    // Flux depends on magnet position (closer = stronger field through coil)
    // Maximum flux when magnet is at coil center (position = 0)
    const distanceFactor = Math.exp(-Math.pow(pos / 50, 2));
    const flux = fieldStrength * 0.01 * coilTurns * distanceFactor;
    return flux;
  }, [fieldStrength, coilTurns]);

  // Animation effect
  useEffect(() => {
    if (!isAnimating) return;

    const dt = 0.016;

    const animate = () => {
      setMagnetPosition(prev => {
        let newPos = prev + magnetVelocity;

        // Bounce at boundaries
        if (newPos > 100 || newPos < -100) {
          setMagnetVelocity(v => -v * 0.9);
          return prev;
        }

        // Calculate EMF from flux change
        const newFlux = calculateFlux(newPos);
        const oldFlux = lastFluxRef.current;
        const emf = -coilTurns * ((newFlux - oldFlux) / dt);
        setInducedEMF(emf * 100);
        lastFluxRef.current = newFlux;

        setFluxHistory(h => {
          const updated = [...h, newFlux];
          if (updated.length > 100) updated.shift();
          return updated;
        });

        return newPos;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    lastFluxRef.current = calculateFlux(magnetPosition);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, magnetVelocity, calculateFlux, magnetPosition, coilTurns]);

  const startMagnetDemo = useCallback(() => {
    setMagnetPosition(-80);
    setMagnetVelocity(3);
    setIsAnimating(true);
    setFluxHistory([]);
  }, []);

  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  // Navigation handler
  const goToPhase = useCallback((newPhase: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(newPhase);

    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'electromagnetic-induction',
        gameTitle: 'Electromagnetic Induction',
        details: { phase: newPhase },
        timestamp: Date.now()
      });
    }

    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  // Responsive typography
  const typo = {
    title: isMobile ? 'text-2xl' : 'text-4xl',
    heading: isMobile ? 'text-xl' : 'text-2xl',
    body: isMobile ? 'text-sm' : 'text-base',
    small: isMobile ? 'text-xs' : 'text-sm',
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 1: HOOK - Engaging introduction
  // ══════════════════════════════════════════════════════════════════════════
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      {/* Premium Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-blue-400 text-sm font-medium">Electromagnetic Physics</span>
      </div>

      {/* Gradient Title */}
      <h1 className={`${typo.title} font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent mb-3`}>
        The Magic of Moving Magnets
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg mb-8 max-w-md">
        Discover how changing magnetic fields create electricity
      </p>

      {/* Premium Card with Visualization */}
      <div style={{ backdropFilter: 'blur(16px)', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '24px', padding: isMobile ? '24px' : '32px', maxWidth: '672px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
        <svg width={isMobile ? 280 : 360} height={200} viewBox={`0 0 ${isMobile ? 280 : 360} 200`} style={{ display: 'block', margin: '0 auto 16px', maxWidth: '100%' }}>
          <defs>
            <linearGradient id="hookBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="hookCoil" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="hookNorth" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="hookSouth" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <radialGradient id="hookBulbGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>
            <filter id="hookGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <pattern id="hookGrid" width="15" height="15" patternUnits="userSpaceOnUse">
              <rect width="15" height="15" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width={isMobile ? 280 : 360} height="200" fill="url(#hookBg)" rx="12" />
          <rect x="0" y="0" width={isMobile ? 280 : 360} height="200" fill="url(#hookGrid)" rx="12" />

          {/* Coil */}
          <g filter="url(#hookGlow)">
            {[...Array(6)].map((_, i) => (
              <ellipse
                key={i}
                cx={isMobile ? 140 : 180}
                cy="100"
                rx={22 + i * 5}
                ry={38}
                fill="none"
                stroke="url(#hookCoil)"
                strokeWidth="3.5"
                opacity={0.9 - i * 0.1}
              />
            ))}
          </g>

          {/* Wire to bulb */}
          <line x1={isMobile ? 118 : 155} y1="75" x2={isMobile ? 75 : 90} y2="75" stroke="url(#hookCoil)" strokeWidth="3" />
          <line x1={isMobile ? 75 : 90} y1="75" x2={isMobile ? 60 : 70} y2="85" stroke="url(#hookCoil)" strokeWidth="3" />

          {/* Light bulb with glow */}
          <circle cx={isMobile ? 60 : 70} cy="100" r="22" fill="url(#hookBulbGlow)" filter="url(#hookGlow)" />
          <circle cx={isMobile ? 60 : 70} cy="100" r="14" fill="#fef3c7" stroke="#fbbf24" strokeWidth="2" />
          <rect x={isMobile ? 55 : 65} y="118" width="10" height="8" fill="#64748b" rx="1" />

          {/* Magnet with animation */}
          <g className="animate-pulse">
            <rect x={isMobile ? 195 : 255} y="78" width="45" height="44" rx="5" fill="url(#hookNorth)" />
            <rect x={isMobile ? 240 : 300} y="78" width="45" height="44" rx="5" fill="url(#hookSouth)" />
            <text x={isMobile ? 217 : 277} y="105" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">N</text>
            <text x={isMobile ? 262 : 322} y="105" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">S</text>
          </g>

          {/* Motion arrow */}
          <path d={`M ${isMobile ? 188 : 248} 100 L ${isMobile ? 168 : 218} 100`} stroke="#22c55e" strokeWidth="4" strokeLinecap="round" markerEnd="url(#arrowGreen)" />
          <polygon points={`${isMobile ? 168 : 218},95 ${isMobile ? 158 : 208},100 ${isMobile ? 168 : 218},105`} fill="#22c55e" />
        </svg>

        <p className="text-xl text-slate-300 mb-4">
          Move a magnet near a coil of wire... and a light bulb turns on!
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          No batteries. No power source. Just a moving magnet. How is this possible?
        </p>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => goToPhase('predict')}
        style={{
          marginTop: '32px',
          padding: '16px 32px',
          background: 'linear-gradient(135deg, #2563eb, #0891b2)',
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: 600,
          borderRadius: '16px',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          lineHeight: 1.5
        }}
      >
        Discover the Secret
        <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      <p style={{ marginTop: '16px', color: '#64748b', fontSize: '14px', lineHeight: 1.5 }}>Tap to begin your exploration</p>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 2: PREDICT - User makes a prediction
  // ══════════════════════════════════════════════════════════════════════════
  const renderPredict = () => {
    const options = [
      { id: 'a', label: 'The magnet transfers electrons directly to the wire' },
      { id: 'b', label: 'The changing magnetic field induces an electric field that pushes charges', correct: true },
      { id: 'c', label: 'Heat from the magnet causes electrons to move' },
      { id: 'd', label: 'Static electricity builds up between magnet and coil' }
    ];

    const handlePrediction = (id: string) => {
      setPrediction(id);
      playSound(id === 'b' ? 'success' : 'failure');
      if (onGameEvent) {
        onGameEvent({
          eventType: 'prediction_made',
          gameType: 'electromagnetic-induction',
          gameTitle: 'Electromagnetic Induction',
          details: { prediction: id, correct: id === 'b' },
          timestamp: Date.now()
        });
      }
    };

    const width = isMobile ? 300 : 380;
    const height = 180;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px' }}>
        <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: '#ffffff', marginBottom: '24px', lineHeight: 1.4 }}>Make Your Prediction</h2>

        <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '672px', marginBottom: '24px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          {/* Static SVG diagram for predict phase */}
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', margin: '0 auto 16px', maxWidth: '100%' }}>
            <defs>
              <linearGradient id="predictBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="50%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="predictCoil" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="predictNorth" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="50%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
              <linearGradient id="predictSouth" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
              <radialGradient id="predictMeter" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="70%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </radialGradient>
              <pattern id="predictGrid" width="15" height="15" patternUnits="userSpaceOnUse">
                <rect width="15" height="15" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.3" />
              </pattern>
            </defs>

            {/* Background */}
            <rect x="0" y="0" width={width} height={height} fill="url(#predictBg)" rx="12" />
            <rect x="0" y="0" width={width} height={height} fill="url(#predictGrid)" rx="12" />

            {/* Coil in center */}
            <g>
              {[...Array(8)].map((_, i) => (
                <ellipse
                  key={i}
                  cx={width / 2}
                  cy={height / 2}
                  rx={22 + i * 4}
                  ry={40}
                  fill="none"
                  stroke="url(#predictCoil)"
                  strokeWidth="3.5"
                  opacity={0.9 - i * 0.08}
                />
              ))}
            </g>

            {/* Wire connections to galvanometer */}
            <line x1={width / 2 - 54} y1={height / 2 - 32} x2={width / 2 - 80} y2={height / 2 - 45} stroke="url(#predictCoil)" strokeWidth="3" strokeLinecap="round" />
            <line x1={width / 2 - 54} y1={height / 2 + 32} x2={width / 2 - 80} y2={height / 2 + 45} stroke="url(#predictCoil)" strokeWidth="3" strokeLinecap="round" />

            {/* Galvanometer */}
            <circle cx={width / 2 - 100} cy={height / 2} r={24} fill="url(#predictMeter)" stroke="#475569" strokeWidth="2" />
            <circle cx={width / 2 - 100} cy={height / 2} r={18} fill="#0f172a" stroke="#334155" strokeWidth="1" />
            {[-25, 0, 25].map((angle, i) => (
              <line
                key={i}
                x1={width / 2 - 100 + Math.sin(angle * Math.PI / 180) * 13}
                y1={height / 2 - Math.cos(angle * Math.PI / 180) * 13}
                x2={width / 2 - 100 + Math.sin(angle * Math.PI / 180) * 16}
                y2={height / 2 - Math.cos(angle * Math.PI / 180) * 16}
                stroke="#64748b"
                strokeWidth="1"
              />
            ))}
            {/* Meter needle */}
            <line
              x1={width / 2 - 100}
              y1={height / 2}
              x2={width / 2 - 100}
              y2={height / 2 - 14}
              stroke="#22c55e"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx={width / 2 - 100} cy={height / 2} r={4} fill="#22c55e" />

            {/* Bar magnet moving toward coil */}
            <g>
              <rect x={width / 2 + 60} y={height / 2 - 18} width={35} height={36} rx="4" fill="url(#predictNorth)" />
              <rect x={width / 2 + 95} y={height / 2 - 18} width={35} height={36} rx="4" fill="url(#predictSouth)" />
              <text x={width / 2 + 77} y={height / 2 + 5} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">N</text>
              <text x={width / 2 + 112} y={height / 2 + 5} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">S</text>
            </g>

            {/* Motion arrow */}
            <path d={`M ${width / 2 + 55} ${height / 2} L ${width / 2 + 40} ${height / 2}`} stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
            <polygon points={`${width / 2 + 40},${height / 2 - 5} ${width / 2 + 30},${height / 2} ${width / 2 + 40},${height / 2 + 5}`} fill="#22c55e" />

            {/* Label */}
            <text x={width / 2} y={height - 12} textAnchor="middle" fill="#94a3b8" fontSize="11">Magnet approaching coil</text>
          </svg>

          <p className={`${typo.body} text-slate-300 mb-4`}>
            A bar magnet is pushed toward a coil of wire connected to a meter. The meter needle deflects, indicating electric current!
          </p>
          <p className="text-cyan-400 font-medium">
            What causes current to flow in the wire?
          </p>
        </div>

        <div className="grid gap-3 w-full max-w-xl">
          {options.map(option => (
            <button
              key={option.id}
              onClick={() => handlePrediction(option.id)}
              disabled={prediction !== null}
              className={`p-4 rounded-xl text-left transition-all duration-300 ${
                prediction === option.id
                  ? option.correct
                    ? 'bg-emerald-600/40 border-2 border-emerald-400'
                    : 'bg-red-600/40 border-2 border-red-400'
                  : prediction && option.correct
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : prediction
                  ? 'bg-slate-700/30 border-2 border-transparent opacity-50'
                  : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent cursor-pointer'
              }`}
            >
              <span className="font-bold text-white">{option.id.toUpperCase()}.</span>
              <span className="text-slate-200 ml-2">{option.label}</span>
            </button>
          ))}
        </div>

        {prediction && (
          <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
            <p className="text-emerald-400 font-semibold">
              {prediction === 'b' ? 'Correct!' : 'Not quite.'} This is <span className="text-cyan-400">Faraday's Law of Electromagnetic Induction</span>!
            </p>
            <p className="text-slate-400 text-sm mt-2">
              A changing magnetic field creates an electric field - this is one of the most important discoveries in physics!
            </p>
            <button
              onClick={() => goToPhase('play')}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all duration-300"
            >
              Explore the Physics
            </button>
          </div>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 3: PLAY - Interactive simulation
  // ══════════════════════════════════════════════════════════════════════════
  const renderPlay = () => {
    const width = isMobile ? 320 : 420;
    const height = isMobile ? 220 : 260;
    const coilCenterX = width / 2;
    const coilCenterY = height / 2;
    const magnetX = coilCenterX + (magnetPosition * width / 300);
    const emfColor = inducedEMF > 0 ? '#22c55e' : inducedEMF < 0 ? '#ef4444' : '#94a3b8';
    const emfIntensity = Math.min(Math.abs(inducedEMF) / 50, 1);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '16px' }}>
        <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: '#ffffff', marginBottom: '16px', lineHeight: 1.4 }}>Electromagnetic Induction Lab</h2>

        {/* What the visualization shows */}
        <p style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'center', maxWidth: '600px', lineHeight: 1.6 }}>
          Watch how moving a magnet through a coil induces an electrical current. This demonstrates Faraday's Law in action.
        </p>

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
        {/* Main Visualization */}
        <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}>
            <defs>
              <linearGradient id="labBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="50%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="coilGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="magnetNorth" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="50%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
              <linearGradient id="magnetSouth" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
              <radialGradient id="galvanometer" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="70%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </radialGradient>
              <filter id="coilGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation={4 + emfIntensity * 4} result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <pattern id="labGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.3" />
              </pattern>
            </defs>

            {/* Background */}
            <rect x="0" y="0" width={width} height={height} fill="url(#labBg)" rx="12" />
            <rect x="0" y="0" width={width} height={height} fill="url(#labGrid)" rx="12" />

            {/* Magnetic field lines */}
            {showFieldLines && (
              <g opacity="0.5">
                {[-40, -20, 20, 40].map((offset, i) => {
                  const curveAmplitude = Math.abs(offset) * 2.5 + 35;
                  return (
                    <path
                      key={i}
                      d={`M ${magnetX - 50} ${coilCenterY + offset} Q ${coilCenterX} ${coilCenterY + offset - curveAmplitude * Math.sign(offset)} ${magnetX + 100} ${coilCenterY + offset}`}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                    />
                  );
                })}
                {/* Center field line */}
                <line x1={magnetX - 50} y1={coilCenterY} x2={magnetX + 100} y2={coilCenterY} stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 4" />
              </g>
            )}
            {/* EMF response curve */}
            <path
              d={`M ${width * 0.05} ${height * 0.88} L ${width * 0.12} ${height * 0.84} L ${width * 0.19} ${height * 0.76} L ${width * 0.26} ${height * 0.62} L ${width * 0.33} ${height * 0.42} L ${width * 0.40} ${height * 0.22} L ${width * 0.47} ${height * 0.12} L ${width * 0.54} ${height * 0.22} L ${width * 0.61} ${height * 0.42} L ${width * 0.68} ${height * 0.62} L ${width * 0.75} ${height * 0.76} L ${width * 0.82} ${height * 0.84} L ${width * 0.95} ${height * 0.88}`}
              fill="none"
              stroke={emfColor}
              strokeWidth="2"
              opacity="0.35"
              strokeDasharray="4 4"
            />

            {/* Coil with glow based on EMF */}
            <g>
              {emfIntensity > 0.05 && (
                <ellipse
                  cx={coilCenterX}
                  cy={coilCenterY}
                  rx={58}
                  ry={65}
                  fill="none"
                  stroke={emfColor}
                  strokeWidth={emfIntensity * 12}
                  opacity={emfIntensity * 0.6}
                  filter="url(#coilGlow)"
                />
              )}
              {[...Array(10)].map((_, i) => (
                <ellipse
                  key={i}
                  cx={coilCenterX}
                  cy={coilCenterY}
                  rx={28 + i * 3}
                  ry={48}
                  fill="none"
                  stroke="url(#coilGrad)"
                  strokeWidth="4"
                  opacity={0.9 - i * 0.07}
                />
              ))}
            </g>

            {/* Wire connections */}
            <line x1={coilCenterX - 58} y1={coilCenterY - 38} x2={coilCenterX - 88} y2={coilCenterY - 55} stroke="url(#coilGrad)" strokeWidth="4" strokeLinecap="round" />
            <line x1={coilCenterX - 58} y1={coilCenterY + 38} x2={coilCenterX - 88} y2={coilCenterY + 55} stroke="url(#coilGrad)" strokeWidth="4" strokeLinecap="round" />

            {/* Galvanometer */}
            <circle cx={coilCenterX - 105} cy={coilCenterY} r={28} fill="url(#galvanometer)" stroke="#475569" strokeWidth="2" />
            <circle cx={coilCenterX - 105} cy={coilCenterY} r={22} fill="#0f172a" stroke="#334155" strokeWidth="1" />
            {[-30, -15, 0, 15, 30].map((angle, i) => (
              <line
                key={i}
                x1={coilCenterX - 105 + Math.sin(angle * Math.PI / 180) * 16}
                y1={coilCenterY - Math.cos(angle * Math.PI / 180) * 16}
                x2={coilCenterX - 105 + Math.sin(angle * Math.PI / 180) * 19}
                y2={coilCenterY - Math.cos(angle * Math.PI / 180) * 19}
                stroke="#64748b"
                strokeWidth="1"
              />
            ))}
            <line
              x1={coilCenterX - 105}
              y1={coilCenterY}
              x2={coilCenterX - 105 + Math.sin(inducedEMF * 0.1) * 18}
              y2={coilCenterY - Math.cos(inducedEMF * 0.1) * 18}
              stroke={emfColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx={coilCenterX - 105} cy={coilCenterY} r={5} fill={emfColor} />

            {/* Bar Magnet */}
            <g transform={`translate(${magnetX}, ${coilCenterY})`}>
              <rect x="-42" y="-22" width="42" height="44" fill="url(#magnetNorth)" rx="4" />
              <rect x="0" y="-22" width="42" height="44" fill="url(#magnetSouth)" rx="4" />
              <line x1="0" y1="-22" x2="0" y2="22" stroke="#1e293b" strokeWidth="2" />
              <text x="-21" y="5" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">N</text>
              <text x="21" y="5" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">S</text>
              {isAnimating && magnetVelocity !== 0 && (
                <polygon
                  points={magnetVelocity > 0 ? "52,-5 65,0 52,5" : "-52,-5 -65,0 -52,5"}
                  fill="#22c55e"
                />
              )}
            </g>

            {/* Data panel */}
            <g>
              <rect x="8" y="8" width="140" height="68" fill="#0f172a" rx="8" stroke="#334155" strokeWidth="1" />
              <text x="18" y="28" fill="#94a3b8" fontSize="11">Flux</text>
              <text x="138" y="28" fill="#60a5fa" fontSize="11" textAnchor="end">{calculateFlux(magnetPosition).toFixed(4)} Wb</text>
              <text x="18" y="46" fill="#94a3b8" fontSize="11">Voltage</text>
              <text x="138" y="46" fill={emfColor} fontSize="11" textAnchor="end">{inducedEMF.toFixed(1)} mV</text>
              <text x="18" y="64" fill="#94a3b8" fontSize="11">Turns</text>
              <text x="138" y="64" fill="#f59e0b" fontSize="11" textAnchor="end">{coilTurns}</text>
            </g>
            {/* Axis labels */}
            <text x={width / 2} y={height - 8} textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11">Position</text>
            <text x="12" y={height / 2} fill="rgba(148,163,184,0.7)" fontSize="11" transform={`rotate(-90, 12, ${height / 2})`}>Voltage</text>
          </svg>
        </div>
        </div>

        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
        {/* Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', width: '100%', marginBottom: '16px' }}>
          <button
            onClick={() => isAnimating ? stopAnimation() : startMagnetDemo()}
            style={{
              padding: '12px',
              borderRadius: '12px',
              fontWeight: 600,
              transition: 'all 0.2s ease',
              backgroundColor: isAnimating ? '#dc2626' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {isAnimating ? 'Stop' : 'Start Demo'}
          </button>

          <button
            onClick={() => setShowFieldLines(!showFieldLines)}
            style={{
              padding: '12px',
              borderRadius: '12px',
              fontWeight: 500,
              transition: 'all 0.2s ease',
              backgroundColor: showFieldLines ? '#0891b2' : '#475569',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Field Lines: {showFieldLines ? 'ON' : 'OFF'}
          </button>

          <div style={{ padding: '12px', backgroundColor: 'rgba(71, 85, 105, 0.5)', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Coil Turns (frequency)</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(148,163,184,0.7)', marginBottom: '4px' }}>
              <span>10 (low)</span>
              <span>100 (max)</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={coilTurns}
              onChange={(e) => setCoilTurns(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '20px',
                touchAction: 'pan-y',
                WebkitAppearance: 'none',
                accentColor: '#3b82f6'
              }}
            />
            <div style={{ color: '#22d3ee', fontWeight: 700, marginTop: '4px' }}>{coilTurns}</div>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'rgba(71, 85, 105, 0.5)', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Field Intensity (energy)</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(148,163,184,0.7)', marginBottom: '4px' }}>
              <span>0.1 (weak)</span>
              <span>2 (strong)</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={fieldStrength}
              onChange={(e) => setFieldStrength(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: '20px',
                touchAction: 'pan-y',
                WebkitAppearance: 'none',
                accentColor: '#3b82f6'
              }}
            />
            <div style={{ color: '#22d3ee', fontWeight: 700, marginTop: '4px' }}>{fieldStrength.toFixed(1)} T</div>
          </div>
        </div>
        </div>
        </div>

        {/* Why this matters */}
        <p style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'center', maxWidth: '600px', marginBottom: '16px', lineHeight: 1.6 }}>
          This principle powers generators, transformers, and electric motors - the backbone of modern electrical technology.
        </p>

        {/* Faraday's Law explanation */}
        <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', padding: '16px', maxWidth: '672px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#22d3ee', marginBottom: '12px', lineHeight: 1.4 }}>Faraday's Law:</h3>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', backgroundColor: '#334155', padding: '8px 16px', borderRadius: '8px' }}>
              EMF = -N x dPhi/dt
            </span>
          </div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#cbd5e1', lineHeight: 1.5 }}>
            <li><strong>EMF:</strong> Induced voltage (volts)</li>
            <li><strong>N:</strong> Number of coil turns (more turns = more EMF)</li>
            <li><strong>dPhi/dt:</strong> Rate of change of magnetic flux (faster change = more EMF)</li>
            <li><strong>Negative sign:</strong> Lenz's Law - induced current opposes the change</li>
          </ul>
        </div>

        <button
          onClick={() => { stopAnimation(); goToPhase('review'); }}
          style={{
            marginTop: '24px',
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #2563eb, #0891b2)',
            color: '#ffffff',
            fontWeight: 600,
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          Review the Concepts
        </button>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 4: REVIEW - Debrief explaining the physics
  // ══════════════════════════════════════════════════════════════════════════
  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${typo.heading} font-bold text-white mb-6`}>Understanding Electromagnetic Induction</h2>

      {/* Reference to prediction */}
      <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '24px', maxWidth: '672px', border: '1px solid rgba(16, 185, 129, 0.2)', lineHeight: 1.6 }}>
        <p style={{ color: '#34d399', fontSize: '15px' }}>
          As you predicted, the changing magnetic field is what causes current to flow. This is exactly what Faraday discovered - a changing magnetic field induces an electric field that pushes charges through the wire.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">Faraday's Law</h3>
          <ul className={`space-y-2 text-slate-300 ${typo.small}`}>
            <li>- Discovered by Michael Faraday in 1831</li>
            <li>- Changing magnetic flux induces EMF</li>
            <li>- EMF = -N x dPhi/dt</li>
            <li>- Phi = B x A x cos(theta) (magnetic flux)</li>
            <li>- Faster change = greater induced voltage</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-3">Lenz's Law</h3>
          <ul className={`space-y-2 text-slate-300 ${typo.small}`}>
            <li>- The "negative sign" in Faraday's Law</li>
            <li>- Induced current opposes the change</li>
            <li>- Nature resists flux changes</li>
            <li>- Explains magnetic braking</li>
            <li>- Conservation of energy in action</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">Magnetic Flux</h3>
          <ul className={`space-y-2 text-slate-300 ${typo.small}`}>
            <li>- Phi = B x A x cos(theta)</li>
            <li>- B: Magnetic field strength (Tesla)</li>
            <li>- A: Area of loop (m squared)</li>
            <li>- theta: Angle between field and area normal</li>
            <li>- Units: Weber (Wb) = T x m squared</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Ways to Change Flux</h3>
          <ul className={`space-y-2 text-slate-300 ${typo.small}`}>
            <li>- Move a magnet near a coil</li>
            <li>- Rotate the coil in a field (generators)</li>
            <li>- Change the field strength (transformers)</li>
            <li>- Change the area (stretching loops)</li>
            <li>- Change the angle (rotating loops)</li>
          </ul>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Discover a Surprising Twist
      </button>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 5: TWIST PREDICT - Second prediction with new variable
  // ══════════════════════════════════════════════════════════════════════════
  const renderTwistPredict = () => {
    const options = [
      { id: 'a', label: 'The field inside immediately drops to zero' },
      { id: 'b', label: 'The field slowly decays over several hours' },
      { id: 'c', label: 'The field is "trapped" and persists indefinitely', correct: true },
      { id: 'd', label: 'The field reverses direction' }
    ];

    const handleTwistPrediction = (id: string) => {
      setTwistPrediction(id);
      playSound(id === 'c' ? 'success' : 'failure');
    };

    const width = isMobile ? 300 : 380;
    const height = 180;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '9999px', backgroundColor: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)', marginBottom: '16px' }}>
          <span style={{ color: '#c084fc', fontSize: '14px', fontWeight: 500 }}>Twist Challenge</span>
        </div>

        <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: '#c084fc', marginBottom: '24px', lineHeight: 1.4 }}>The Superconductor Surprise</h2>

        <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '672px', marginBottom: '24px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          {/* Static SVG diagram for twist predict phase */}
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', margin: '0 auto 16px', maxWidth: '100%' }}>
            <defs>
              <linearGradient id="twistPredictBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="50%" stopColor="#1e1b4b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="twistSuperRing" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e879f9" />
                <stop offset="50%" stopColor="#c026d3" />
                <stop offset="100%" stopColor="#9333ea" />
              </linearGradient>
              <filter id="twistGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <pattern id="twistGrid" width="15" height="15" patternUnits="userSpaceOnUse">
                <rect width="15" height="15" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.3" />
              </pattern>
            </defs>

            {/* Background */}
            <rect x="0" y="0" width={width} height={height} fill="url(#twistPredictBg)" rx="12" />
            <rect x="0" y="0" width={width} height={height} fill="url(#twistGrid)" rx="12" />

            {/* External magnetic field lines */}
            {[-30, -15, 0, 15, 30].map((offset, i) => (
              <line
                key={i}
                x1={20}
                y1={height / 2 + offset}
                x2={width - 20}
                y2={height / 2 + offset}
                stroke="#60a5fa"
                strokeWidth="2"
                strokeDasharray="6 4"
                opacity={0.6}
              />
            ))}

            {/* Superconducting ring with glow */}
            <ellipse
              cx={width / 2}
              cy={height / 2}
              rx={55}
              ry={35}
              fill="none"
              stroke="#a855f7"
              strokeWidth="14"
              opacity="0.3"
              filter="url(#twistGlow)"
            />
            <ellipse
              cx={width / 2}
              cy={height / 2}
              rx={55}
              ry={35}
              fill="none"
              stroke="url(#twistSuperRing)"
              strokeWidth="8"
            />

            {/* Field lines through ring */}
            {[-15, 0, 15].map((offset, i) => (
              <line
                key={i}
                x1={width / 2 - 40}
                y1={height / 2 + offset}
                x2={width / 2 + 40}
                y2={height / 2 + offset}
                stroke="#60a5fa"
                strokeWidth="2.5"
                opacity="0.9"
              />
            ))}

            {/* Labels */}
            <text x={width / 2} y={25} textAnchor="middle" fill="#a855f7" fontSize="12" fontWeight="bold">Superconducting Ring</text>
            <text x={width / 2} y={height - 12} textAnchor="middle" fill="#60a5fa" fontSize="11">External magnetic field B</text>

            {/* Question mark indicator */}
            <circle cx={width - 35} cy={35} r={18} fill="#1e1b4b" stroke="#a855f7" strokeWidth="2" />
            <text x={width - 35} y={42} textAnchor="middle" fill="#a855f7" fontSize="20" fontWeight="bold">?</text>
          </svg>

          <p className={`${typo.body} text-slate-300 mb-4`}>
            A superconducting ring (zero electrical resistance) is placed in a magnetic field. Then the external field is suddenly turned off.
          </p>
          <p className="text-lg text-cyan-400 font-medium">
            What happens to the magnetic field inside the ring?
          </p>
        </div>

        <div className="grid gap-3 w-full max-w-xl">
          {options.map(option => (
            <button
              key={option.id}
              onClick={() => handleTwistPrediction(option.id)}
              disabled={twistPrediction !== null}
              className={`p-4 rounded-xl text-left transition-all duration-300 ${
                twistPrediction === option.id
                  ? option.correct
                    ? 'bg-emerald-600/40 border-2 border-emerald-400'
                    : 'bg-red-600/40 border-2 border-red-400'
                  : twistPrediction && option.correct
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : twistPrediction
                  ? 'bg-slate-700/30 border-2 border-transparent opacity-50'
                  : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent cursor-pointer'
              }`}
            >
              <span className="font-bold text-white">{option.id.toUpperCase()}.</span>
              <span className="text-slate-200 ml-2">{option.label}</span>
            </button>
          ))}
        </div>

        {twistPrediction && (
          <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
            <p className="text-emerald-400 font-semibold">
              {twistPrediction === 'c' ? 'Correct!' : 'Surprising!'} The field is trapped forever in a superconducting loop!
            </p>
            <p className="text-slate-400 text-sm mt-2">
              This is called "flux trapping" - a superconductor perfectly opposes any flux change, maintaining the field indefinitely.
            </p>
            <button
              onClick={() => goToPhase('twist_play')}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
            >
              See How
            </button>
          </div>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 6: TWIST PLAY - Second interactive experiment
  // ══════════════════════════════════════════════════════════════════════════
  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${typo.heading} font-bold text-purple-400 mb-4`}>Flux Trapping in Superconductors</h2>

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
        {/* Normal Conductor */}
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2 text-center">Normal Conductor</h3>
          <svg width="280" height="220" viewBox="0 0 280 220" className="mx-auto" style={{ maxWidth: '100%' }}>
            <defs>
              <linearGradient id="normalBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="normalRing" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9ca3af" />
                <stop offset="100%" stopColor="#4b5563" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="280" height="220" fill="url(#normalBg)" rx="10" />
            <text x="140" y="22" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="12">Current vs Time</text>
            <ellipse cx="140" cy="90" rx="65" ry="42" fill="none" stroke="url(#normalRing)" strokeWidth="12" />
            {[-22, 0, 22].map((offset, i) => (
              <line key={i} x1="85" y1={90 + offset} x2="195" y2={90 + offset} stroke="#60a5fa" strokeWidth="2" strokeDasharray="5 3" opacity={0.3 + i * 0.1} />
            ))}
            {/* Decay curve - exponential decay using >25% vertical space */}
            <path d="M 40 100 L 70 120 L 100 145 L 130 162 L 160 175 L 190 185 L 220 192 L 250 197 L 270 200" stroke="#ef4444" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <text x="140" y="212" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11">Time</text>
            <text x="30" y="175" fill="rgba(148,163,184,0.7)" fontSize="11" transform="rotate(-90, 30, 175)">Current</text>
            <path d="M140,130 L140,148" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="135,148 140,158 145,148" fill="#ef4444" />
          </svg>
          <p className="text-center text-sm text-red-400 mt-2">Field decays over time</p>
          <p className="text-center text-xs text-slate-400 mt-1">Resistance causes induced currents to decay</p>
        </div>
      </div>

      <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
        {/* Superconductor */}
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-purple-400 mb-2 text-center">Superconductor</h3>
          <svg width="280" height="220" viewBox="0 0 280 220" className="mx-auto" style={{ maxWidth: '100%' }}>
            <defs>
              <linearGradient id="superBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="50%" stopColor="#1e1b4b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="superRing" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e879f9" />
                <stop offset="50%" stopColor="#c026d3" />
                <stop offset="100%" stopColor="#9333ea" />
              </linearGradient>
              <filter id="superGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect x="0" y="0" width="280" height="220" fill="url(#superBg)" rx="10" />
            <text x="140" y="22" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="12">Current vs Time</text>
            <ellipse cx="140" cy="90" rx="65" ry="42" fill="none" stroke="#a855f7" strokeWidth="18" opacity="0.3" filter="url(#superGlow)" />
            <ellipse cx="140" cy="90" rx="65" ry="42" fill="none" stroke="url(#superRing)" strokeWidth="12" />
            {[-22, 0, 22].map((offset, i) => (
              <line key={i} x1="85" y1={90 + offset} x2="195" y2={90 + offset} stroke="#60a5fa" strokeWidth="3" opacity="0.8" />
            ))}
            {[0, 1, 2, 3].map((i) => {
              const angle = (i / 4) * Math.PI * 2;
              return (
                <circle key={i} cx={140 + Math.cos(angle) * 65} cy={90 + Math.sin(angle) * 42 * 0.6} r="5" fill="#22c55e" />
              );
            })}
            {/* Persistent current - ramps up and holds steady */}
            <path d="M 40 200 L 60 190 L 80 165 L 100 145 L 120 130 L 140 130 L 160 130 L 180 130 L 200 130 L 220 130 L 240 130 L 260 130" stroke="#22c55e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <text x="140" y="212" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11">Time</text>
            <text x="30" y="175" fill="rgba(148,163,184,0.7)" fontSize="11" transform="rotate(-90, 30, 175)">Current</text>
            <text x="140" y="195" textAnchor="middle" fill="#22c55e" fontSize="14" fontWeight="bold">Persistent forever</text>
          </svg>
          <p className="text-center text-sm text-emerald-400 mt-2">Field trapped forever</p>
          <p className="text-center text-xs text-slate-400 mt-1">Zero resistance = currents flow forever!</p>
        </div>
      </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-purple-400 mb-3">Why Flux Gets Trapped:</h3>
        <ul className={`space-y-2 text-slate-300 ${typo.small}`}>
          <li><strong>Lenz's Law:</strong> Any flux change induces current that opposes it</li>
          <li><strong>Zero Resistance:</strong> In a superconductor, this current never dies</li>
          <li><strong>Perfect Opposition:</strong> The induced current exactly maintains the original flux</li>
          <li><strong>Result:</strong> Magnetic field is "frozen" inside the loop</li>
        </ul>
        <p className="text-cyan-400 mt-4 text-sm">
          This principle enables MRI machines, particle accelerators, and quantum computers!
        </p>
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Review the Discovery
      </button>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 7: TWIST REVIEW - Deep explanation
  // ══════════════════════════════════════════════════════════════════════════
  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${typo.heading} font-bold text-purple-400 mb-6`}>Key Discovery</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Electromagnetic Induction Powers Our World!</h3>
        <div className="space-y-4 text-slate-300">
          <p>Faraday's discovery that changing magnetic fields create electric fields is the foundation of:</p>
          <ul className={`list-disc list-inside space-y-2 ${typo.small}`}>
            <li>Every power plant and generator</li>
            <li>All transformers in the power grid</li>
            <li>Electric motors (reverse of generators)</li>
            <li>Wireless charging technology</li>
            <li>Induction cooktops</li>
            <li>Metal detectors and security scanners</li>
            <li>MRI machines and medical imaging</li>
            <li>Electric vehicle motors and regenerative braking</li>
          </ul>
          <p className="text-emerald-400 font-medium mt-4">
            Without electromagnetic induction, we'd have no practical way to generate or distribute electricity!
          </p>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-cyan-400 mb-3">The Superconductor Insight</h3>
        <p className={`text-slate-300 ${typo.small}`}>
          Superconductors take Lenz's Law to the extreme. With zero resistance, induced currents persist forever,
          perfectly opposing any change in magnetic flux. This "flux pinning" effect is why superconducting magnets
          can maintain intense magnetic fields indefinitely - essential for MRI machines, particle accelerators like
          the Large Hadron Collider, and emerging quantum computers.
        </p>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all duration-300"
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 8: TRANSFER - 4 real-world applications with details
  // ══════════════════════════════════════════════════════════════════════════
  const renderTransfer = () => {
    const app = realWorldApps[selectedApp];
    const allCompleted = completedApps.every(c => c);

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className={`${typo.heading} font-bold text-white mb-6`}>Real-World Applications</h2>

        {/* App selector tabs */}
        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          {realWorldApps.map((a, index) => (
            <button
              key={index}
              onClick={() => setSelectedApp(index)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedApp === index
                  ? 'text-white'
                  : completedApps[index]
                  ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              style={selectedApp === index ? { backgroundColor: a.color } : {}}
            >
              {a.icon} {a.short}
            </button>
          ))}
        </div>

        {/* Scrollable application content container */}
        <div style={{ overflowY: 'auto', maxHeight: '70vh', width: '100%', maxWidth: '672px' }}>
          {/* Application detail card */}
          <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">{app.icon}</span>
              <div>
                <h3 className="text-xl font-bold text-white">{app.title}</h3>
                <p className="text-cyan-400 text-sm">{app.tagline}</p>
              </div>
            </div>

            <p className={`text-slate-300 mb-4 ${typo.small}`}>{app.description}</p>

            <div style={{ backgroundColor: 'rgba(51, 65, 85, 0.5)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <h4 className="text-sm font-semibold text-cyan-400 mb-2">Physics Connection:</h4>
              <p className="text-sm text-slate-300">{app.connection}</p>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-semibold text-white mb-2">How It Works:</h4>
              <p className={`text-slate-300 ${typo.small}`}>{app.howItWorks}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {app.stats.map((stat, i) => (
                <div key={i} style={{ backgroundColor: 'rgba(51, 65, 85, 0.5)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <div className="text-cyan-400 font-bold text-sm">{stat.value}</div>
                  <div className="text-slate-400 text-xs">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Examples */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-white mb-2">Real Examples:</h4>
              <ul className={`text-slate-300 ${typo.small} space-y-1`}>
                {app.examples.map((ex, i) => (
                  <li key={i}>- {ex}</li>
                ))}
              </ul>
            </div>

            {/* Companies */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-white mb-2">Leading Companies:</h4>
              <div className="flex flex-wrap gap-2">
                {app.companies.map((company, i) => (
                  <span key={i} className="px-2 py-1 bg-slate-600/50 rounded text-xs text-slate-300">{company}</span>
                ))}
              </div>
            </div>

            {/* Future Impact */}
            <div style={{ background: 'linear-gradient(to right, rgba(88, 28, 135, 0.3), rgba(136, 19, 55, 0.3))', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <h4 className="text-sm font-semibold text-purple-400 mb-2">Future Impact:</h4>
              <p className="text-sm text-slate-300">{app.futureImpact}</p>
            </div>

            {!completedApps[selectedApp] && (
              <button
                onClick={() => {
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                  playSound('success');
                }}
                className="w-full mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
              >
                Mark as Understood
              </button>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-6 flex items-center gap-2">
          <span className="text-slate-400">Progress:</span>
          <div className="flex gap-1">
            {realWorldApps.map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full ${completedApps[i] ? 'bg-emerald-500' : 'bg-slate-600'}`} />
            ))}
          </div>
          <span className="text-slate-400">{completedApps.filter(c => c).length}/4</span>
        </div>

        {allCompleted && (
          <button
            onClick={() => goToPhase('test')}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all duration-300"
          >
            Take the Knowledge Test
          </button>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 9: TEST - 10 scenario-based multiple choice questions
  // ══════════════════════════════════════════════════════════════════════════
  const renderTest = () => {
    const calculateScore = () => {
      return testAnswers.reduce((score, answer, index) => {
        if (answer === null) return score;
        const correct = testQuestions[index].options.find(o => o.id === answer)?.correct;
        return score + (correct ? 1 : 0);
      }, 0);
    };

    const handleSubmit = () => {
      const score = calculateScore();
      setTestScore(score);
      setTestSubmitted(true);
      playSound(score >= 7 ? 'complete' : 'failure');

      if (onGameEvent) {
        onGameEvent({
          eventType: 'answer_submitted',
          gameType: 'electromagnetic-induction',
          gameTitle: 'Electromagnetic Induction',
          details: { score, total: 10, passed: score >= 7 },
          timestamp: Date.now()
        });
      }
    };

    if (!testSubmitted) {
      const q = testQuestions[currentQuestion];
      const allAnswered = testAnswers.every(a => a !== null);

      return (
        <div className="flex flex-col items-center p-6">
          <h2 className={`${typo.heading} font-bold text-white mb-4`}>Knowledge Assessment</h2>

          {/* Question number indicator */}
          <div className="text-lg font-semibold text-cyan-400 mb-3">
            Question {currentQuestion + 1} of {testQuestions.length}
          </div>

          {/* Progress dots */}
          <div className="flex gap-2 mb-6">
            {testQuestions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuestion(i)}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: currentQuestion === i
                    ? '#3b82f6'
                    : testAnswers[i] !== null
                    ? '#10b981'
                    : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  transform: currentQuestion === i ? 'scale(1.3)' : 'scale(1)',
                }}
                aria-label={`Go to question ${i + 1}`}
              />
            ))}
          </div>

          {/* Question card */}
          <div className="bg-slate-800/50 rounded-xl p-6 max-w-2xl w-full">
            <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
              <p className="text-cyan-400 text-sm italic">{q.scenario}</p>
            </div>

            <p className="text-white font-medium mb-4">
              {currentQuestion + 1}. {q.question}
            </p>

            <div className="grid gap-3">
              {q.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = option.id;
                    setTestAnswers(newAnswers);
                    playSound('click');
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    backgroundColor: testAnswers[currentQuestion] === option.id
                      ? '#2563eb'
                      : '#334155',
                    color: testAnswers[currentQuestion] === option.id
                      ? '#ffffff'
                      : '#cbd5e1',
                    border: testAnswers[currentQuestion] === option.id
                      ? '2px solid #60a5fa'
                      : '2px solid transparent',
                    transform: testAnswers[currentQuestion] === option.id
                      ? 'scale(1.02)'
                      : 'scale(1)',
                    boxShadow: testAnswers[currentQuestion] === option.id
                      ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                      : 'none',
                  }}
                >
                  <span className="font-bold">{option.id.toUpperCase()}.</span> {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-4 mt-6">
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
              >
                Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => setCurrentQuestion(currentQuestion + 1)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
              >
                Next
              </button>
            ) : allAnswered && (
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500"
              >
                Submit Answers
              </button>
            )}
          </div>
        </div>
      );
    }

    // Results view
    return (
      <div className="flex flex-col items-center p-6">
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{testScore >= 7 ? '🎉' : '📚'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">Score: {testScore}/10</h3>
            <p className="text-slate-300">
              {testScore >= 7
                ? 'Excellent! You\'ve mastered electromagnetic induction!'
                : 'Keep studying! Review the concepts and try again.'}
            </p>
          </div>

          {/* Explanations */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto mb-6">
            {testQuestions.map((q, i) => {
              const userAnswer = testAnswers[i];
              const isCorrect = q.options.find(o => o.id === userAnswer)?.correct;
              return (
                <div key={i} className={`p-3 rounded-lg ${isCorrect ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <span className="text-sm text-slate-300 font-medium">Question {i + 1}</span>
                  </div>
                  <p className="text-xs text-slate-400">{q.explanation}</p>
                </div>
              );
            })}
          </div>

          {testScore >= 7 ? (
            <button
              onClick={() => goToPhase('mastery')}
              className="w-full px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500"
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onClick={() => {
                setTestSubmitted(false);
                setTestAnswers(Array(10).fill(null));
                setCurrentQuestion(0);
                goToPhase('review');
              }}
              className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-cyan-500"
            >
              Review and Try Again
            </button>
          )}
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 10: MASTERY - Completion celebration
  // ══════════════════════════════════════════════════════════════════════════
  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-blue-900/50 via-cyan-900/50 to-teal-900/50 rounded-3xl p-8 max-w-2xl">
        {/* Badge */}
        <div className="relative mb-6">
          <div className="text-8xl animate-bounce">⚡</div>
          <div className="absolute -top-2 -right-2 text-4xl">🏆</div>
        </div>

        <h1 className={`${typo.title} font-bold bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 bg-clip-text text-transparent mb-4`}>
          Electromagnetic Induction Master!
        </h1>

        <p className="text-xl text-slate-300 mb-6">
          You've mastered the physics that powers our entire electrical world!
        </p>

        {/* Achievement badges */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-3xl mb-2">🧲</div>
            <p className="text-sm text-slate-300">Faraday's Law</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-3xl mb-2">🔄</div>
            <p className="text-sm text-slate-300">Lenz's Law</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-3xl mb-2">⚡</div>
            <p className="text-sm text-slate-300">Generators</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-3xl mb-2">🔌</div>
            <p className="text-sm text-slate-300">Transformers</p>
          </div>
        </div>

        <div className="bg-slate-800/30 rounded-xl p-4 mb-6">
          <h3 className="text-lg font-bold text-cyan-400 mb-2">What You've Learned:</h3>
          <ul className={`text-slate-300 ${typo.small} text-left space-y-1`}>
            <li>- How changing magnetic flux induces EMF (Faraday's Law)</li>
            <li>- Why induced currents oppose their cause (Lenz's Law)</li>
            <li>- How generators convert motion to electricity</li>
            <li>- Why transformers can step voltage up or down</li>
            <li>- How superconductors trap magnetic flux forever</li>
            <li>- Real-world applications from power plants to phones</li>
          </ul>
        </div>

        <button
          onClick={() => goToPhase('hook')}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
        >
          Explore Again
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER PHASE
  // ══════════════════════════════════════════════════════════════════════════
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
          conceptName="Electromagnetic Induction"
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

  const phaseNames: Record<Phase, string> = {
    hook: 'Hook',
    predict: 'Predict',
    play: 'Explore',
    review: 'Review',
    twist_predict: 'Twist',
    twist_play: 'Discover',
    twist_review: 'Insight',
    transfer: 'Apply',
    test: 'Test',
    mastery: 'Master'
  };

  // Get previous and next phases for navigation
  const currentIndex = validPhases.indexOf(phase);
  const prevPhase = currentIndex > 0 ? validPhases[currentIndex - 1] : null;
  const nextPhase = currentIndex < validPhases.length - 1 ? validPhases[currentIndex + 1] : null;

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: '#0a0f1a',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* Premium Background Layers */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.5), transparent, rgba(6, 95, 70, 0.5))' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at top, rgba(30, 64, 175, 0.2), transparent, transparent)' }} />

      {/* Ambient Glow Circles */}
      <div style={{ position: 'absolute', top: '25%', left: '0', width: '200px', height: '200px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', filter: 'blur(48px)', transform: 'translateX(-50%)' }} />
      <div style={{ position: 'absolute', bottom: '25%', right: '0', width: '200px', height: '200px', backgroundColor: 'rgba(6, 182, 212, 0.1)', borderRadius: '50%', filter: 'blur(48px)', transform: 'translateX(50%)' }} />

      {/* Top Navigation Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backdropFilter: 'blur(16px)',
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          maxWidth: '896px',
          margin: '0 auto'
        }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#94a3b8' }}>Electromagnetic Induction</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {validPhases.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                title={phaseNames[p]}
                aria-label={phaseNames[p]}
                style={{
                  width: phase === p ? '24px' : '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: phase === p ? '#3b82f6' : validPhases.indexOf(phase) > i ? '#3b82f6' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  padding: 0,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '14px', color: '#64748b' }}>{phaseNames[phase]}</span>
        </div>
      </div>

      {/* Main content area with scroll */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        paddingTop: '56px',
        paddingBottom: '16px',
        flex: 1,
        overflowY: 'auto'
      }}>
        {renderPhase()}
      </div>

      {/* Bottom Navigation Bar */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backdropFilter: 'blur(16px)',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '12px 16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '896px',
          margin: '0 auto',
          gap: '16px'
        }}>
          {/* Back Button */}
          <button
            onClick={() => prevPhase && goToPhase(prevPhase)}
            disabled={!prevPhase}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              backgroundColor: prevPhase ? '#334155' : '#1e293b',
              color: prevPhase ? '#ffffff' : '#64748b',
              border: 'none',
              cursor: prevPhase ? 'pointer' : 'not-allowed',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'all 0.2s ease',
              opacity: prevPhase ? 1 : 0.5
            }}
          >
            Back
          </button>

          {/* Phase indicator */}
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            {currentIndex + 1} / {validPhases.length}
          </span>

          {/* Next Button */}
          <button
            onClick={() => nextPhase && goToPhase(nextPhase)}
            disabled={!nextPhase}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: nextPhase ? 'linear-gradient(135deg, #2563eb, #0891b2)' : '#1e293b',
              color: nextPhase ? '#ffffff' : '#64748b',
              border: 'none',
              cursor: nextPhase ? 'pointer' : 'not-allowed',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'all 0.2s ease',
              opacity: nextPhase ? 1 : 0.5
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ElectromagneticInductionRenderer;
