'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// EDDY-CURRENT PENDULUM GAME - Complete 10-Phase Learning Experience
// Core Concept: Eddy currents create magnetic braking via Lenz's Law
// Real-World Application: Train brakes, metal detectors, induction cooktops
// ============================================================================

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

interface EddyCurrentPendulumRendererProps {
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

// ============================================================================
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ============================================================================
const testQuestions = [
  {
    scenario: "A physics teacher drops an aluminum plate through a gap between two powerful magnets. The plate falls much slower than expected, as if moving through honey, even though aluminum is not magnetic.",
    question: "What causes this invisible braking effect on the non-magnetic aluminum?",
    options: [
      { id: 'a', label: "Air resistance increases between the magnets due to the magnetic field" },
      { id: 'b', label: "Eddy currents induced in the aluminum create an opposing magnetic field", correct: true },
      { id: 'c', label: "The aluminum becomes temporarily magnetized and sticks to the magnets" },
      { id: 'd', label: "Static electricity builds up and creates electrostatic attraction" }
    ],
    explanation: "When a conductor moves through a magnetic field, electromagnetic induction creates circular currents (eddy currents) within the metal. By Lenz's Law, these currents generate their own magnetic field that opposes the motion, creating a braking force without any physical contact."
  },
  {
    scenario: "At airport security, you walk through a metal detector archway. The device beeps when you forget to remove your watch, even though the watch isn't magnetic and doesn't touch the detector.",
    question: "How does the metal detector sense the presence of your non-magnetic watch?",
    options: [
      { id: 'a', label: "It detects the watch's weight pressing on pressure sensors in the floor" },
      { id: 'b', label: "It uses X-rays to see through your clothing and identify metal objects" },
      { id: 'c', label: "The detector's alternating magnetic field induces eddy currents in the watch, which are detected", correct: true },
      { id: 'd', label: "It measures changes in air density caused by the metal object" }
    ],
    explanation: "Metal detectors generate an alternating magnetic field. When metal passes through, eddy currents are induced in the metal, creating a secondary magnetic field that disturbs the original field. This disturbance is detected by the receiver coil, triggering the alarm regardless of whether the metal is magnetic."
  },
  {
    scenario: "A chef demonstrates an induction cooktop by placing a cast iron skillet on it - the pan heats up rapidly. However, when she places an aluminum pan on the same cooktop, it barely gets warm.",
    question: "Why does the cast iron pan heat efficiently while the aluminum pan does not?",
    options: [
      { id: 'a', label: "Cast iron is a better conductor of heat than aluminum" },
      { id: 'b', label: "Aluminum reflects the heat waves generated by the cooktop" },
      { id: 'c', label: "Cast iron is ferromagnetic, allowing stronger eddy currents and additional hysteresis heating", correct: true },
      { id: 'd', label: "The aluminum pan is too shiny and reflects the induction energy" }
    ],
    explanation: "Induction cooktops work by inducing eddy currents in the cookware. Ferromagnetic materials like cast iron not only support strong eddy currents but also experience hysteresis heating as the magnetic domains repeatedly realign. Aluminum, being non-magnetic and highly conductive, allows eddy currents to flow too easily, generating less resistive heating."
  },
  {
    scenario: "A high-speed train traveling at 300 km/h needs to make an emergency stop. The driver activates the electromagnetic brakes, and strong magnets are lowered toward the rails. The train decelerates smoothly without any screeching or sparks.",
    question: "Why do electromagnetic brakes become more effective as the train's speed increases?",
    options: [
      { id: 'a', label: "The magnets get stronger when they move faster through the air" },
      { id: 'b', label: "Higher speeds mean greater rate of change in magnetic flux, inducing stronger eddy currents", correct: true },
      { id: 'c', label: "The rails expand from friction heat, creating more contact surface" },
      { id: 'd', label: "Faster movement compresses the air between magnets and rails, increasing drag" }
    ],
    explanation: "Electromagnetic braking force is proportional to velocity. According to Faraday's Law, faster motion through the magnetic field creates a greater rate of change of magnetic flux, which induces stronger eddy currents in the rail. These stronger currents produce a proportionally stronger opposing magnetic field, creating more braking force exactly when it's needed most."
  },
  {
    scenario: "An electrical engineer is designing a power transformer. She chooses to build the core from thin steel sheets stacked together with insulating varnish between them, rather than using a solid steel block of the same total mass.",
    question: "Why is the laminated core design more efficient than a solid core?",
    options: [
      { id: 'a', label: "Laminations make the transformer lighter and easier to install" },
      { id: 'b', label: "The insulating layers increase the magnetic field strength" },
      { id: 'c', label: "Laminations restrict eddy current paths, reducing energy losses as heat", correct: true },
      { id: 'd', label: "Solid steel cannot conduct magnetic flux as effectively as thin sheets" }
    ],
    explanation: "In a solid core, eddy currents would flow in large loops, wasting energy as heat. Laminations break up these current paths, forcing any eddy currents to flow within individual thin sheets. Since the sheets are thin and separated by insulation, the eddy current loops are small and have high resistance, dramatically reducing power losses."
  },
  {
    scenario: "A quality control inspector tests aircraft aluminum parts for hidden cracks using an eddy current probe. She moves the probe across the surface and watches a display that shows signal variations.",
    question: "How does the eddy current probe detect cracks that are invisible to the naked eye?",
    options: [
      { id: 'a', label: "Cracks emit ultrasonic sounds when eddy currents pass through them" },
      { id: 'b', label: "The probe measures temperature changes caused by current flowing through cracks" },
      { id: 'c', label: "Cracks disrupt the normal eddy current flow pattern, changing the probe's impedance reading", correct: true },
      { id: 'd', label: "Magnetic particles accumulate in cracks and are detected by the probe" }
    ],
    explanation: "The probe generates eddy currents in the metal surface. These currents flow in circular patterns and create their own magnetic field that the probe detects. When a crack is present, it interrupts the eddy current flow path, like a roadblock forcing traffic to detour. This changes the detected signal in a characteristic way, revealing the crack's presence, size, and depth."
  },
  {
    scenario: "A scientist demonstrates magnetic levitation by spinning a thick aluminum disk at high speed on a spindle, then bringing a strong magnet close above it. Remarkably, the magnet floats stably above the spinning disk without touching it.",
    question: "What enables the magnet to levitate above the spinning aluminum disk?",
    options: [
      { id: 'a', label: "The centrifugal force from the spinning disk pushes air upward, supporting the magnet" },
      { id: 'b', label: "Eddy currents in the spinning disk create a repulsive magnetic field that supports the magnet's weight", correct: true },
      { id: 'c', label: "The aluminum becomes magnetized by the spinning motion and repels the magnet" },
      { id: 'd', label: "Static electricity from the spinning disk creates an electrostatic levitation force" }
    ],
    explanation: "The spinning disk moves relative to the stationary magnet, inducing powerful eddy currents in the aluminum. By Lenz's Law, these currents create a magnetic field that opposes the magnet's field - a repulsive force. When spinning fast enough, this repulsion overcomes gravity, allowing stable levitation. This principle is used in some maglev train designs."
  },
  {
    scenario: "At a recycling facility, a conveyor belt carries mixed metal scraps over a rapidly rotating drum containing powerful magnets. Aluminum cans fly off the belt in one direction, while plastic bottles fall straight down, even though aluminum is not magnetic.",
    question: "How does this eddy current separator distinguish aluminum from non-conducting materials?",
    options: [
      { id: 'a', label: "The aluminum is lighter and is blown away by fans near the drum" },
      { id: 'b', label: "The rotating magnetic field induces eddy currents in aluminum, creating a repulsive force that ejects it", correct: true },
      { id: 'c', label: "The drum becomes electrically charged and repels the aluminum" },
      { id: 'd', label: "Aluminum resonates with the drum's rotation frequency and bounces off" }
    ],
    explanation: "The rotating drum's alternating magnetic poles create a rapidly changing magnetic field. This induces strong eddy currents in conducting materials like aluminum, generating an opposing magnetic field. The interaction between these fields creates a repulsive force that launches the aluminum off the belt. Non-conductors like plastic cannot support eddy currents and simply fall with gravity."
  },
  {
    scenario: "An electrical engineer notices that when transmitting high-frequency AC power through a solid copper wire, most of the current flows near the surface rather than through the entire cross-section. At very high frequencies, the center of the wire carries almost no current.",
    question: "What phenomenon causes current to concentrate near the conductor's surface at high frequencies?",
    options: [
      { id: 'a', label: "The surface of the wire has lower resistance because it's in contact with cooling air" },
      { id: 'b', label: "High-frequency electrons are lighter and travel faster along the surface" },
      { id: 'c', label: "Eddy currents induced by the changing magnetic field oppose current flow in the conductor's interior", correct: true },
      { id: 'd', label: "Electromagnetic waves travel only on the surface of conductors" }
    ],
    explanation: "This is the skin effect, caused by self-induced eddy currents within the conductor. The alternating current creates a changing magnetic field inside the wire, which induces opposing eddy currents. These eddy currents cancel the main current in the interior while reinforcing it near the surface. Higher frequencies create faster-changing fields, pushing current closer to the surface."
  },
  {
    scenario: "A precision laboratory balance uses a metal vane attached to the weighing platform that moves between magnets. When you place an object on the balance, the needle swings once and quickly settles to the correct reading instead of oscillating back and forth.",
    question: "How do the magnets help the balance reach a stable reading quickly?",
    options: [
      { id: 'a', label: "The magnets attract the metal vane and hold it in place once it stops moving" },
      { id: 'b', label: "Eddy currents induced in the moving vane create a damping force that absorbs oscillation energy", correct: true },
      { id: 'c', label: "The magnetic field increases air resistance around the vane" },
      { id: 'd', label: "The magnets create friction by rubbing against the vane at a microscopic level" }
    ],
    explanation: "This is electromagnetic damping in action. When the vane oscillates, it moves through the magnetic field, inducing eddy currents. These currents convert the kinetic energy of oscillation into heat, quickly dissipating the unwanted motion. The damping force is automatically proportional to velocity - faster motion creates stronger eddy currents and more braking."
  }
];

// ============================================================================
// REAL-WORLD APPLICATIONS - 4 detailed applications with stats
// ============================================================================
const realWorldApps = [
  {
    icon: "🚄",
    title: "Train Electromagnetic Brakes",
    short: "High-speed rail safety systems",
    tagline: "Stopping 300 km/h trains without friction or wear",
    description: "High-speed trains use electromagnetic brakes that lower powerful magnets toward the steel rails. Unlike friction brakes that wear out and can overheat, electromagnetic brakes use eddy currents to convert kinetic energy directly into heat in the rails. The braking force increases with speed, providing maximum stopping power when it's needed most - at high velocities.",
    connection: "Just like our pendulum slowed down when moving through the magnetic field, train wheels slow when rails pass through the magnetic field. The same Lenz's Law principle applies: motion through a magnetic field induces opposing currents.",
    howItWorks: "Electromagnets are lowered to within millimeters of the rail surface. The relative motion between the magnetic field and the steel rail induces powerful eddy currents in the rail. By Lenz's Law, these currents generate an opposing magnetic field that creates a braking force proportional to velocity. The kinetic energy is converted to heat and dissipates into the massive rail.",
    stats: [
      { value: "300+ km/h", label: "Maximum braking speed", icon: "🏃" },
      { value: "0 wear", label: "Contact-free operation", icon: "⚙️" },
      { value: "5 MW", label: "Peak braking power", icon: "⚡" }
    ],
    examples: ["German ICE high-speed trains", "Japanese Shinkansen braking assist", "Roller coaster final brakes", "Maglev train deceleration"],
    companies: ["Knorr-Bremse", "Wabtec", "CRRC", "Siemens Mobility"],
    futureImpact: "Next-generation maglev systems will use superconducting magnets for even stronger eddy current braking, enabling safe stopping from speeds over 600 km/h while recovering energy back to the grid through regenerative systems.",
    color: "#3B82F6"
  },
  {
    icon: "🔍",
    title: "Metal Detectors & Security",
    short: "Finding hidden metal objects",
    tagline: "Detecting metal without physical contact",
    description: "Metal detectors use alternating magnetic fields to induce eddy currents in metallic objects. These currents create their own magnetic field that the detector senses, revealing hidden metal regardless of whether it's magnetic or not. From airport security to archaeological discoveries, eddy current detection is everywhere.",
    connection: "Our pendulum showed how conductors interact with magnetic fields even without being magnetic themselves. Metal detectors exploit this same principle - aluminum, copper, and gold all generate detectable eddy currents when exposed to changing magnetic fields.",
    howItWorks: "A transmitter coil creates an oscillating magnetic field (typically 5-25 kHz). When this field encounters metal, it induces circular eddy currents in the object. These eddy currents generate a secondary magnetic field that opposes the original, causing a measurable change in the receiver coil's signal. Signal processing identifies the metal type by analyzing response characteristics.",
    stats: [
      { value: "99.9%", label: "Detection accuracy", icon: "🎯" },
      { value: "3 m", label: "Deep target depth", icon: "📏" },
      { value: "1000+/hr", label: "People screened", icon: "👥" }
    ],
    examples: ["Airport security walkthrough gates", "Handheld security wands", "Archaeological survey equipment", "Industrial contamination detectors"],
    companies: ["Garrett", "Minelab", "CEIA", "Fisher Research Labs"],
    futureImpact: "AI-enhanced metal detectors will distinguish between harmless items and threats with near-perfect accuracy. Multi-sensor fusion combining eddy current detection with millimeter-wave imaging will enable walk-through screening at normal pace.",
    color: "#EF4444"
  },
  {
    icon: "🍳",
    title: "Induction Cooktops",
    short: "Cooking with invisible magnetic heat",
    tagline: "The pot heats up, but the cooktop stays cool",
    description: "Induction cooktops generate a high-frequency magnetic field (20-100 kHz) that passes through the ceramic surface and induces powerful eddy currents directly in ferromagnetic cookware. The pot's electrical resistance converts these currents into heat, cooking food with remarkable efficiency. The cooktop itself stays cool since no heat transfer occurs through conduction.",
    connection: "Our pendulum's braking converted kinetic energy to heat through eddy current resistance. Induction cooking uses the same principle - instead of motion through a static field, a rapidly oscillating field in a stationary pot creates the same resistive heating effect.",
    howItWorks: "A coil beneath the ceramic surface carries high-frequency alternating current, creating a rapidly oscillating magnetic field. This field penetrates ferromagnetic pans (iron, steel) and induces eddy currents. The pan's electrical resistance converts current to heat. Additionally, ferromagnetic materials experience hysteresis heating as magnetic domains repeatedly flip. Power is controlled by adjusting frequency and amplitude.",
    stats: [
      { value: "90%", label: "Energy efficiency", icon: "⚡" },
      { value: "50%", label: "Faster than gas", icon: "⏱️" },
      { value: "1 C", label: "Temperature precision", icon: "🌡️" }
    ],
    examples: ["Professional restaurant kitchens", "Home induction ranges", "Portable induction burners", "Industrial food processing"],
    companies: ["Miele", "Bosch", "Samsung", "GE Appliances", "Thermador"],
    futureImpact: "Smart induction cooktops with AI will automatically detect pan contents and adjust power to prevent boiling over. Flexible cooking zones will allow pans of any size to be placed anywhere on the surface.",
    color: "#F59E0B"
  },
  {
    icon: "🔬",
    title: "Non-Destructive Testing (NDT)",
    short: "Finding hidden flaws without damage",
    tagline: "Detecting invisible cracks before they cause failure",
    description: "Eddy current testing (ECT) is a critical inspection technique for finding cracks, corrosion, and material defects in conductive materials without damaging the part. A probe coil induces eddy currents in the test material, and any defects that disrupt the current flow are detected as changes in the probe's impedance. This technique inspects aircraft, pipelines, and nuclear plants.",
    connection: "Remember how slits in our pendulum disrupted eddy current flow and reduced braking? NDT uses this same principle - defects like cracks interrupt eddy current paths just like our slits did, creating detectable signal changes.",
    howItWorks: "An ECT probe coil generates an alternating magnetic field that induces eddy currents in the test material. These currents flow in closed loops perpendicular to the field. Defects create barriers that force currents to detour, changing the current distribution and altering the probe's impedance. Phase and amplitude analysis reveals defect depth, size, and orientation.",
    stats: [
      { value: "0.1 mm", label: "Min crack detection", icon: "🔍" },
      { value: "25 mm", label: "Subsurface depth", icon: "📐" },
      { value: "$45B", label: "NDT market size", icon: "💰" }
    ],
    examples: ["Aircraft fuselage inspection", "Heat exchanger tube testing", "Pipeline weld verification", "Turbine blade crack detection"],
    companies: ["Olympus NDT", "Eddyfi Technologies", "GE Inspection", "Zetec"],
    futureImpact: "AI-powered ECT systems will automatically interpret signals and classify defects in real-time. Robotic inspection systems will autonomously scan complex structures, enabling predictive maintenance that prevents failures before they happen.",
    color: "#8B5CF6"
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const EddyCurrentPendulumRenderer: React.FC<EddyCurrentPendulumRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Pendulum simulation state
  const [materialType, setMaterialType] = useState<'aluminum' | 'copper' | 'plastic' | 'wood'>('aluminum');
  const [hasSlits, setHasSlits] = useState(false);
  const [magnetStrength, setMagnetStrength] = useState(80);
  const [isSwinging, setIsSwinging] = useState(false);
  const [pendulumAngle, setPendulumAngle] = useState(45);
  const [angularVelocity, setAngularVelocity] = useState(0);
  const animationRef = useRef<number | null>(null);

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

  // Material conductivity (affects damping)
  const materialConductivity = useMemo(() => {
    const conductivities: Record<string, number> = {
      copper: 1.0,
      aluminum: 0.65,
      plastic: 0.0,
      wood: 0.0,
    };
    return conductivities[materialType] || 0;
  }, [materialType]);

  // Damping coefficient based on material and slits
  const dampingCoefficient = useMemo(() => {
    let damping = materialConductivity * (magnetStrength / 100) * 0.15;
    if (hasSlits && materialConductivity > 0) {
      damping *= 0.2; // Slits reduce eddy currents by 80%
    }
    return damping;
  }, [materialConductivity, magnetStrength, hasSlits]);

  // Eddy current intensity (for visualization)
  const eddyCurrentIntensity = useMemo(() => {
    if (materialConductivity === 0) return 0;
    const velocity = Math.abs(angularVelocity);
    let intensity = velocity * materialConductivity * (magnetStrength / 100);
    if (hasSlits) intensity *= 0.2;
    return Math.min(100, intensity * 50);
  }, [angularVelocity, materialConductivity, magnetStrength, hasSlits]);

  // Pendulum physics simulation
  useEffect(() => {
    if (!isSwinging) return;

    const g = 9.81;
    const L = 1.0;
    const dt = 0.016;

    const simulate = () => {
      setPendulumAngle(prev => {
        const angleRad = (prev * Math.PI) / 180;
        const gravityAccel = -(g / L) * Math.sin(angleRad) * (180 / Math.PI);
        const dampingForce = -dampingCoefficient * angularVelocity * 10;
        const airDamping = -0.01 * angularVelocity;
        const totalAccel = gravityAccel + dampingForce + airDamping;

        setAngularVelocity(v => v + totalAccel * dt);

        const newAngle = prev + angularVelocity * dt;

        if (Math.abs(newAngle) < 0.5 && Math.abs(angularVelocity) < 1) {
          setIsSwinging(false);
          return 0;
        }

        return newAngle;
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isSwinging, dampingCoefficient, angularVelocity]);

  // Start pendulum swing
  const startSwing = () => {
    setPendulumAngle(60);
    setAngularVelocity(0);
    setIsSwinging(true);
  };

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#8B5CF6', // Purple for eddy currents
    accentGlow: 'rgba(139, 92, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0', // High contrast for accessibility
    textMuted: '#cbd5e1', // High contrast for accessibility
    border: '#2a2a3a',
    magnet: '#dc2626',
    magnetBlue: '#3b82f6',
    aluminum: '#e2e8f0', // High contrast
    copper: '#f97316',
    plastic: '#84cc16',
    wood: '#a16207',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Material colors
  const getMaterialColor = (mat: string) => {
    const materialColors: Record<string, string> = {
      aluminum: colors.aluminum,
      copper: colors.copper,
      plastic: colors.plastic,
      wood: colors.wood,
    };
    return materialColors[mat] || colors.aluminum;
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Slits Experiment',
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
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'eddy-current-pendulum',
        gameTitle: 'Eddy Current Pendulum',
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

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #6D28D9)`,
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

  // Navigation bar component
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: colors.bgSecondary,
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      zIndex: 1000,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>&#129522;</span>
        <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>Eddy Current Pendulum</span>
      </div>
      <div className="text-muted text-secondary" style={{ ...typo.small, color: colors.textSecondary }}>
        {phaseLabels[phase]} ({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})
      </div>
    </nav>
  );

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 100,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
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
            minHeight: '44px',
            minWidth: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label={phaseLabels[p]}
        >
          <span style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            display: 'block',
          }} />
        </button>
      ))}
    </div>
  );

  // Pendulum Visualization SVG
  const PendulumVisualization = ({ showLabels = true, isStatic = false }: { showLabels?: boolean; isStatic?: boolean }) => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 300 : 360;
    const pivotX = width / 2;
    const pivotY = 50;
    const pendulumLength = isMobile ? 160 : 200;

    const displayAngle = isStatic ? 45 : pendulumAngle;
    const angleRad = (displayAngle * Math.PI) / 180;
    const bobX = pivotX + Math.sin(angleRad) * pendulumLength;
    const bobY = pivotY + Math.cos(angleRad) * pendulumLength;

    const magnetY = pivotY + pendulumLength - 20;
    const sheetWidth = isMobile ? 45 : 55;
    const sheetHeight = isMobile ? 60 : 75;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="magnetNorth" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          <linearGradient id="magnetSouth" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid background */}
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke={colors.border} strokeWidth="0.5" opacity="0.3" />
        </pattern>
        <rect width={width} height={height} fill="url(#grid)" />

        {/* Support frame */}
        <rect x={pivotX - 70} y={25} width={140} height={10} rx="3" fill="#374151" />
        <rect x={pivotX - 80} y={25} width={12} height={height - 50} rx="3" fill="#374151" />
        <rect x={pivotX + 68} y={25} width={12} height={height - 50} rx="3" fill="#374151" />
        <rect x={pivotX - 90} y={height - 35} width={180} height={18} rx="4" fill="#1f2937" />

        {/* Magnets */}
        <rect x={pivotX - 65} y={magnetY - 35} width={24} height={70} rx="4" fill="url(#magnetNorth)" />
        <text x={pivotX - 53} y={magnetY} fill="white" fontSize="14" fontWeight="bold" textAnchor="middle">N</text>
        <rect x={pivotX + 41} y={magnetY - 35} width={24} height={70} rx="4" fill="url(#magnetSouth)" />
        <text x={pivotX + 53} y={magnetY} fill="white" fontSize="14" fontWeight="bold" textAnchor="middle">S</text>

        {/* Magnetic field lines */}
        <g opacity={0.4}>
          {[-20, -10, 0, 10, 20].map((offset, i) => (
            <path
              key={i}
              d={`M ${pivotX - 40} ${magnetY + offset} Q ${pivotX} ${magnetY + offset + (offset > 0 ? 6 : -6)} ${pivotX + 40} ${magnetY + offset}`}
              fill="none"
              stroke={colors.accent}
              strokeWidth="1.5"
              strokeDasharray="6,4"
            />
          ))}
        </g>

        {/* Pendulum rod */}
        <line
          x1={pivotX}
          y1={pivotY}
          x2={bobX}
          y2={bobY}
          stroke="#64748b"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Pivot point */}
        <circle cx={pivotX} cy={pivotY} r="8" fill="#475569" />
        <circle cx={pivotX} cy={pivotY} r="4" fill="#1e293b" />

        {/* Pendulum bob (metal sheet) */}
        <g transform={`translate(${bobX}, ${bobY}) rotate(${pendulumAngle})`}>
          <rect
            x={-sheetWidth / 2}
            y={-5}
            width={sheetWidth}
            height={sheetHeight}
            rx="4"
            fill={getMaterialColor(materialType)}
            stroke={getMaterialColor(materialType)}
            strokeWidth="1"
          />
          {/* Slits */}
          {hasSlits && materialConductivity > 0 && (
            <>
              {[0, 1, 2, 3].map(i => (
                <rect
                  key={i}
                  x={-sheetWidth / 2 + 6 + i * 10}
                  y={8}
                  width={4}
                  height={sheetHeight - 18}
                  rx="1"
                  fill={colors.bgPrimary}
                />
              ))}
            </>
          )}
        </g>

        {/* Eddy current visualization */}
        {eddyCurrentIntensity > 5 && materialConductivity > 0 && (
          <g transform={`translate(${bobX}, ${bobY + 20}) rotate(${pendulumAngle})`} filter="url(#glow)">
            {[0, 1, 2].map(i => (
              <circle
                key={i}
                cx={0}
                cy={0}
                r={8 + i * 6}
                fill="none"
                stroke={colors.accent}
                strokeWidth={2 - i * 0.5}
                strokeDasharray={`${10 + i * 3},${5 + i * 2}`}
                opacity={eddyCurrentIntensity / 150 * (1 - i * 0.25)}
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from={angularVelocity > 0 ? "0" : "360"}
                  to={angularVelocity > 0 ? "360" : "0"}
                  dur={`${0.8 + i * 0.2}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}
          </g>
        )}

        {/* Labels */}
        {showLabels && (
          <>
            <text x={pivotX} y={height - 12} fill={colors.textSecondary} fontSize="12" textAnchor="middle">
              {materialType.charAt(0).toUpperCase() + materialType.slice(1)} {hasSlits ? '(with slits)' : ''}
              {materialConductivity > 0 ? ' - Conductor' : ' - Insulator'}
            </text>
            <text x={width - 60} y={30} fill={colors.accent} fontSize="14" fontWeight="600">
              Eddy: {Math.round(eddyCurrentIntensity)}%
            </text>
          </>
        )}

        {/* Legend */}
        <g transform={`translate(10, ${height - 80})`}>
          <text x="0" y="0" fill={colors.textSecondary} fontSize="10" fontWeight="600">Legend:</text>
          <rect x="0" y="8" width="12" height="12" fill="url(#magnetNorth)" rx="2" />
          <text x="16" y="18" fill={colors.textSecondary} fontSize="9">N Pole (Red)</text>
          <rect x="0" y="24" width="12" height="12" fill="url(#magnetSouth)" rx="2" />
          <text x="16" y="34" fill={colors.textSecondary} fontSize="9">S Pole (Blue)</text>
          <rect x="0" y="40" width="12" height="12" fill={getMaterialColor(materialType)} rx="2" />
          <text x="16" y="50" fill={colors.textSecondary} fontSize="9">Pendulum Bob</text>
          <circle cx="6" cy="62" r="5" fill="none" stroke={colors.accent} strokeWidth="1.5" strokeDasharray="3,2" />
          <text x="16" y="66" fill={colors.textSecondary} fontSize="9">Eddy Currents</text>
        </g>
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingTop: '80px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          &#129522;&#128260;
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Invisible Magnetic Braking
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          &quot;What if you could stop a speeding train with magnets, even though the wheels aren&apos;t magnetic? Discover the <span style={{ color: colors.accent }}>mysterious force</span> that brakes without touching.&quot;
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            &quot;Swing an aluminum plate through a magnetic field. Even though aluminum isn&apos;t magnetic at all - a magnet won&apos;t stick to it - something strange happens. The plate slows down dramatically, as if moving through invisible honey.&quot;
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Electromagnetic Phenomenon
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover the Secret
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Nothing happens - aluminum is not magnetic, so magnets have no effect' },
      { id: 'b', text: 'The pendulum slows down dramatically - an invisible force brakes it', correct: true },
      { id: 'c', text: 'The pendulum sticks to the magnets - all metals are attracted to magnets' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              Make Your Prediction - Step 1 of 3
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            An aluminum pendulum swings through a gap between two strong magnets. What will happen?
          </h2>

          {/* Static SVG Visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <PendulumVisualization showLabels={false} isStatic={true} />
          </div>

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
              Test My Prediction
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Eddy Current Pendulum
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Compare different materials swinging through the magnetic field
          </p>

          {/* Observation Guidance */}
          <div style={{
            background: `${colors.accent}15`,
            border: `1px solid ${colors.accent}40`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Observe:</strong> Watch how different materials behave when swinging through the magnetic field. Notice how conductors (aluminum, copper) slow down while insulators (plastic, wood) swing freely.
            </p>
          </div>

          {/* Real-world relevance */}
          <div style={{
            background: `${colors.success}11`,
            border: `1px solid ${colors.success}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.success }}>Why This Matters:</strong> This principle is used in real-world applications like high-speed train brakes, metal detectors at airports, and induction cooktops. Engineers design these systems using eddy current technology because the braking force is proportional to velocity - the faster you go, the stronger the brake!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <PendulumVisualization />
            </div>

            {/* Material selector */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ ...typo.small, color: colors.textSecondary, marginBottom: '12px' }}>
                Select Material:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {(['aluminum', 'copper', 'plastic', 'wood'] as const).map(mat => (
                  <button
                    key={mat}
                    onClick={() => { setMaterialType(mat); setIsSwinging(false); setPendulumAngle(45); playSound('click'); }}
                    style={{
                      padding: '12px 8px',
                      backgroundColor: materialType === mat ? `${getMaterialColor(mat)}30` : colors.bgSecondary,
                      border: `2px solid ${materialType === mat ? getMaterialColor(mat) : colors.border}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      minHeight: '44px',
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      backgroundColor: getMaterialColor(mat),
                      borderRadius: '4px',
                      margin: '0 auto 6px'
                    }} />
                    <div style={{ color: colors.textPrimary, fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>
                      {mat}
                    </div>
                    <div style={{ color: colors.textMuted, fontSize: '10px' }}>
                      {mat === 'aluminum' || mat === 'copper' ? 'Conductor' : 'Insulator'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Magnet strength slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Magnet Strength</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{magnetStrength}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={magnetStrength}
                onChange={(e) => setMagnetStrength(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Swing button */}
            <button
              onClick={startSwing}
              disabled={isSwinging}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                opacity: isSwinging ? 0.6 : 1,
                cursor: isSwinging ? 'not-allowed' : 'pointer',
              }}
            >
              {isSwinging ? 'Swinging...' : 'Release Pendulum'}
            </button>

            {/* Results display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginTop: '20px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: dampingCoefficient > 0.05 ? colors.success : colors.textMuted }}>
                  {dampingCoefficient > 0.05 ? 'STRONG' : dampingCoefficient > 0.01 ? 'WEAK' : 'NONE'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Damping</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{Math.round(eddyCurrentIntensity)}%</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Eddy Current</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.textPrimary }}>{Math.round(pendulumAngle)}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Angle</div>
              </div>
            </div>
          </div>

          {materialConductivity > 0 && dampingCoefficient > 0.03 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Notice the strong braking! The pendulum stops much faster with conductors.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Lenz's Law: Nature's Magnetic Brake
          </h2>

          {/* Reference to prediction */}
          <div style={{
            background: `${colors.accent}11`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}33`,
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Your Prediction:</strong> You predicted what would happen when an aluminum pendulum swings through a magnetic field. As you observed in the experiment, the result shows exactly how eddy currents work!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>What Happened:</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                When the conducting sheet moved through the magnetic field, it slowed down dramatically - even though nothing physically touched it. Non-conductors (plastic, wood) swung freely without any braking.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.accent }}>Why It Happens (Lenz's Law):</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                Motion through a magnetic field induces circular electric currents (<span style={{ color: colors.accent }}>eddy currents</span>) in the conductor. By Lenz's Law, these currents create their own magnetic field that <strong>OPPOSES</strong> the motion that caused them. The kinetic energy is converted to heat in the metal.
              </p>
              <p>
                <strong style={{ color: colors.success }}>Key Insight:</strong> The braking force is proportional to velocity - the faster you move, the stronger the brake. This is perfect for applications like train brakes!
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              The Physics Formula
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              <strong>Induced EMF = -dPhi/dt</strong> (Faraday's Law)
            </p>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              The negative sign represents Lenz's Law - the induced effect always opposes the change that caused it. This is nature's way of conserving energy.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%', minHeight: '44px' }}
          >
            Try the Twist
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Braking becomes STRONGER - more edges means more magnetic interaction' },
      { id: 'b', text: 'Braking becomes WEAKER - slits interrupt the eddy current paths', correct: true },
      { id: 'c', text: 'No change - the material is still aluminum, slits don\'t matter' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Slits in the Metal
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            What if we cut parallel slits through the metal sheet, like a comb?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '60px',
                  height: '80px',
                  backgroundColor: colors.aluminum,
                  borderRadius: '4px',
                  margin: '0 auto 8px',
                }} />
                <p style={{ ...typo.small, color: colors.textMuted }}>Solid Sheet</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>vs</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '60px',
                  height: '80px',
                  backgroundColor: colors.aluminum,
                  borderRadius: '4px',
                  margin: '0 auto 8px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px',
                }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ width: '4px', height: '50px', backgroundColor: colors.bgPrimary, borderRadius: '2px' }} />
                  ))}
                </div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Sheet with Slits</p>
              </div>
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
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Test the Slits
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Solid vs Slotted Sheet
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Toggle slits on the metal sheet and compare the braking effect
          </p>

          {/* Observation Guidance */}
          <div style={{
            background: `${colors.warning}15`,
            border: `1px solid ${colors.warning}40`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.warning }}>Observe:</strong> Compare how the pendulum behaves with and without slits. Notice how slits dramatically reduce the braking effect by interrupting eddy current paths.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <PendulumVisualization />
            </div>

            {/* Slit toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>Solid Sheet</span>
              <button
                onClick={() => { setHasSlits(!hasSlits); setIsSwinging(false); setPendulumAngle(45); playSound('click'); }}
                style={{
                  width: '60px',
                  height: '30px',
                  borderRadius: '15px',
                  border: 'none',
                  background: hasSlits ? colors.warning : colors.border,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.3s',
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: '3px',
                  left: hasSlits ? '33px' : '3px',
                  transition: 'left 0.3s',
                }} />
              </button>
              <span style={{ ...typo.small, color: hasSlits ? colors.warning : colors.textSecondary, fontWeight: hasSlits ? 600 : 400 }}>
                Slotted Sheet
              </span>
            </div>

            {/* Material selector - ensure conductor is selected */}
            {materialConductivity === 0 && (
              <div style={{
                background: `${colors.error}22`,
                border: `1px solid ${colors.error}`,
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.small, color: colors.error, margin: 0 }}>
                  Select a conductor (aluminum or copper) to see the slit effect!
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
              {(['aluminum', 'copper', 'plastic', 'wood'] as const).map(mat => (
                <button
                  key={mat}
                  onClick={() => { setMaterialType(mat); setIsSwinging(false); setPendulumAngle(45); playSound('click'); }}
                  style={{
                    padding: '10px',
                    backgroundColor: materialType === mat ? `${getMaterialColor(mat)}30` : colors.bgSecondary,
                    border: `2px solid ${materialType === mat ? getMaterialColor(mat) : colors.border}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ color: colors.textPrimary, fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>
                    {mat}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={startSwing}
              disabled={isSwinging}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                opacity: isSwinging ? 0.6 : 1,
              }}
            >
              {isSwinging ? 'Swinging...' : 'Release Pendulum'}
            </button>

            {/* Comparison display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginTop: '20px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: hasSlits ? colors.warning : colors.success }}>
                  {hasSlits ? 'WEAK' : 'STRONG'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Current Damping</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{hasSlits ? '20%' : '100%'}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Eddy Current Path</div>
              </div>
            </div>
          </div>

          {hasSlits && materialConductivity > 0 && (
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                The slits dramatically reduce braking! The pendulum swings more freely now.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Why
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Slits Weaken the Brake
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔄</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Eddy Currents Flow in Loops</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Eddy currents are circular - they flow in closed loops within the metal. The larger and more complete these loops, the stronger the braking effect.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>✂️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Slits Interrupt the Paths</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                The slits act as roadblocks, forcing currents to take longer, narrower routes. This increases resistance and reduces total current flow, weakening the braking force by up to <span style={{ color: colors.warning }}>80%</span>.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Real-World Application: Transformer Cores</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                This is why transformer cores are made of <strong>thin laminated sheets</strong> instead of solid metal blocks. The laminations (like our slits) reduce wasteful eddy currents that would otherwise heat up the core and waste energy!
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

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
                    checkmark
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
                Connection to Eddy Current Pendulum:
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
              <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>
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

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                Examples:
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {app.examples.map((ex, i) => (
                  <span key={i} style={{
                    background: colors.bgPrimary,
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: colors.textSecondary,
                  }}>
                    {ex}
                  </span>
                ))}
              </div>
            </div>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                Key Companies:
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {app.companies.map((co, i) => (
                  <span key={i} style={{
                    background: app.color + '22',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: app.color,
                    fontWeight: 600,
                  }}>
                    {co}
                  </span>
                ))}
              </div>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '8px',
              padding: '16px',
              border: `1px solid ${colors.success}33`,
            }}>
              <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 600 }}>
                Future Impact:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.futureImpact}
              </p>
            </div>
          </div>

          {/* Got It button - always visible */}
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                if (selectedApp < realWorldApps.length - 1) {
                  setSelectedApp(selectedApp + 1);
                }
              }}
              style={{ ...primaryButtonStyle, width: '100%', minHeight: '44px' }}
            >
              Got It
            </button>
          </div>

          {/* Take the Knowledge Test button - appears when all apps are completed */}
          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%', minHeight: '44px' }}
            >
              Take the Knowledge Test
            </button>
          )}

          {!allAppsCompleted && (
            <p className="text-muted" style={{ ...typo.small, color: colors.textMuted, textAlign: 'center' }}>
              Explore all 4 applications to continue ({completedApps.filter(c => c).length}/4 completed)
            </p>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100vh',
          background: colors.bgPrimary,
          padding: '24px',
          paddingTop: '80px',
          overflowY: 'auto',
        }}>
          {renderNavBar()}
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🎉' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand eddy current braking!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
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
                style={primaryButtonStyle}
              >
                Review and Try Again
              </button>
            )}
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

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
            {question.options.map(opt => {
              const isSelected = testAnswers[currentQuestion] === opt.id;
              const showResult = testAnswers[currentQuestion] !== null;
              const isCorrect = opt.correct;

              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (showResult) return;
                    playSound('click');
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = opt.id;
                    setTestAnswers(newAnswers);
                    if (opt.correct) {
                      setTestScore(s => s + 1);
                      playSound('success');
                    } else {
                      playSound('failure');
                    }
                  }}
                  disabled={showResult}
                  style={{
                    background: showResult
                      ? isCorrect
                        ? `${colors.success}22`
                        : isSelected
                          ? `${colors.error}22`
                          : colors.bgCard
                      : testAnswers[currentQuestion] === opt.id
                        ? `${colors.accent}22`
                        : colors.bgCard,
                    border: `2px solid ${
                      showResult
                        ? isCorrect
                          ? colors.success
                          : isSelected
                            ? colors.error
                            : colors.border
                        : testAnswers[currentQuestion] === opt.id
                          ? colors.accent
                          : colors.border
                    }`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: showResult ? 'default' : 'pointer',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: showResult
                      ? isCorrect
                        ? colors.success
                        : isSelected
                          ? colors.error
                          : colors.bgSecondary
                      : testAnswers[currentQuestion] === opt.id
                        ? colors.accent
                        : colors.bgSecondary,
                    color: showResult && (isCorrect || isSelected) ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '24px',
                    marginRight: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {showResult && isCorrect ? 'O' : showResult && isSelected && !isCorrect ? 'X' : opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Explanation after answering */}
          {testAnswers[currentQuestion] !== null && (
            <div style={{
              background: `${colors.accent}11`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.accent}33`,
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                Explanation:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {question.explanation}
              </p>
            </div>
          )}

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
                Previous
              </button>
            )}
            {testAnswers[currentQuestion] !== null && (
              currentQuestion < 9 ? (
                <button
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: colors.accent,
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTestSubmitted(true);
                    playSound(testScore >= 7 ? 'complete' : 'failure');
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: colors.success,
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Submit Test
                </button>
              )
            )}
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingTop: '80px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Eddy Current Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how eddy currents create magnetic braking through Lenz's Law - the invisible force that powers everything from train brakes to metal detectors!
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <div style={{ ...typo.h2, color: colors.accent, marginBottom: '16px' }}>
            {testScore} / 10
          </div>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Eddy currents are induced by motion through magnetic fields',
              'Lenz\'s Law: induced currents oppose the change that caused them',
              'Braking force is proportional to velocity',
              'Slits/laminations reduce eddy currents',
              'Real applications: trains, detectors, cooktops, NDT',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>check</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
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

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default EddyCurrentPendulumRenderer;
