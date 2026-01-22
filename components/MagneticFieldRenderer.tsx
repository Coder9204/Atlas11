import React, { useState, useEffect, useCallback, useRef } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// MAGNETIC FIELDS - Field Lines, Forces, and Current Sources
// ════════════════════════════════════════════════════════════════════════════
// Core Physics:
// - B = μ₀I/(2πr) for long straight wire (Biot-Savart simplified)
// - B = μ₀nI for solenoid (n = turns per length)
// - F = qv × B (Lorentz force on moving charge)
// - F = BIL sin(θ) (force on current-carrying wire)
// - Right-hand rule for field direction
// ════════════════════════════════════════════════════════════════════════════

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'field_calculated'
  | 'force_calculated'
  | 'current_adjusted'
  | 'charge_moved'
  | 'compass_updated'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string[];
  stats: { value: string; label: string }[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

interface Props {
  onGameEvent?: (event: { type: GameEventType; data?: Record<string, unknown> }) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const MagneticFieldRenderer: React.FC<Props> = ({
  onGameEvent,
  currentPhase = 0,
  onPhaseComplete
}) => {
  const [phase, setPhase] = useState(currentPhase);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [wireCurrent, setWireCurrent] = useState(5); // Amperes
  const [wireDistance, setWireDistance] = useState(0.05); // meters
  const [chargeVelocity, setChargeVelocity] = useState(1000); // m/s
  const [chargeValue, setChargeValue] = useState(1.6e-19); // Coulombs (electron)
  const [fieldAngle, setFieldAngle] = useState(90); // degrees from velocity
  const [selectedDemo, setSelectedDemo] = useState<'wire' | 'solenoid' | 'force'>('wire');
  const [showFieldLines, setShowFieldLines] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);

  const navigationLockRef = useRef(false);
  const animationRef = useRef<number | null>(null);

  // Physical constants
  const MU_0 = 4 * Math.PI * 1e-7; // Permeability of free space

  const phaseNames = [
    'Hook', 'Predict', 'Explore', 'Review',
    'Twist Predict', 'Twist Explore', 'Twist Review',
    'Transfer', 'Test', 'Mastery'
  ];

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Web Audio API sound system
  const playSound = useCallback((type: 'click' | 'correct' | 'incorrect' | 'complete' | 'hum' | 'force') => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      switch (type) {
        case 'click':
          oscillator.frequency.value = 600;
          oscillator.type = 'sine';
          gainNode.gain.value = 0.1;
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.08);
          break;
        case 'correct':
          oscillator.frequency.value = 523;
          oscillator.type = 'sine';
          gainNode.gain.value = 0.15;
          oscillator.start();
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
        case 'incorrect':
          oscillator.frequency.value = 200;
          oscillator.type = 'sawtooth';
          gainNode.gain.value = 0.1;
          oscillator.start();
          oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.15);
          oscillator.stop(audioContext.currentTime + 0.25);
          break;
        case 'complete':
          oscillator.frequency.value = 440;
          oscillator.type = 'sine';
          gainNode.gain.value = 0.15;
          oscillator.start();
          oscillator.frequency.setValueAtTime(554, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.2);
          oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.3);
          oscillator.stop(audioContext.currentTime + 0.5);
          break;
        case 'hum':
          oscillator.frequency.value = 60;
          oscillator.type = 'sine';
          gainNode.gain.value = 0.05;
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
        case 'force':
          oscillator.frequency.value = 300;
          oscillator.type = 'triangle';
          gainNode.gain.value = 0.1;
          oscillator.start();
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.1);
          oscillator.stop(audioContext.currentTime + 0.15);
          break;
      }
    } catch (e) {
      // Audio not available
    }
  }, []);

  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    playSound('click');
    setPhase(newPhase);

    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', data: { phase: newPhase, phaseName: phaseNames[newPhase] } });
    }

    if (onPhaseComplete && newPhase > 0) {
      onPhaseComplete(newPhase - 1);
    }

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent, onPhaseComplete, phaseNames]);

  // Calculate magnetic field from straight wire
  const calculateWireField = useCallback((I: number, r: number): number => {
    // B = μ₀I / (2πr)
    if (r <= 0) return 0;
    return (MU_0 * I) / (2 * Math.PI * r);
  }, []);

  // Calculate Lorentz force on moving charge
  const calculateLorentzForce = useCallback((q: number, v: number, B: number, theta: number): number => {
    // F = qvB sin(θ)
    return Math.abs(q * v * B * Math.sin(theta * Math.PI / 180));
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;

    const animate = () => {
      setAnimationTime(prev => (prev + 0.02) % (2 * Math.PI));
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating]);

  const handlePrediction = useCallback((prediction: string) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'C' ? 'correct' : 'incorrect');

    if (onGameEvent) {
      onGameEvent({ type: 'prediction_made', data: { prediction, correct: prediction === 'C' } });
    }

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'B' ? 'correct' : 'incorrect');

    if (onGameEvent) {
      onGameEvent({ type: 'prediction_made', data: { prediction, correct: prediction === 'B', twist: true } });
    }

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });

    playSound('click');

    if (onGameEvent) {
      onGameEvent({ type: 'test_answered', data: { questionIndex, answerIndex } });
    }

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');

    if (onGameEvent) {
      onGameEvent({ type: 'app_explored', data: { appIndex } });
    }

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent]);

  // Test questions with scenarios and explanations
  const testQuestions: TestQuestion[] = [
    {
      scenario: "A physics student places a compass near a wire carrying current upward. The compass needle, initially pointing north, deflects.",
      question: "Which way does the compass needle point relative to the wire?",
      options: [
        { text: "Toward the wire", correct: false },
        { text: "Away from the wire", correct: false },
        { text: "Tangent to a circle around the wire (perpendicular to a radius)", correct: true },
        { text: "Parallel to the wire", correct: false }
      ],
      explanation: "Magnetic field lines around a current-carrying wire form concentric circles. The compass aligns with the local field, which is always tangent to these circles—perpendicular to the line connecting the compass to the wire."
    },
    {
      scenario: "An engineer doubles the current in an electromagnet while keeping everything else the same.",
      question: "How does the magnetic field strength change?",
      options: [
        { text: "Stays the same (current doesn't affect field)", correct: false },
        { text: "Doubles (B is proportional to I)", correct: true },
        { text: "Quadruples (B is proportional to I²)", correct: false },
        { text: "Halves (more current means weaker field)", correct: false }
      ],
      explanation: "The Biot-Savart law shows B = μ₀I/(2πr) for a wire, where B is directly proportional to current I. Double the current means double the field strength."
    },
    {
      scenario: "A proton travels horizontally through a region where the magnetic field points straight up.",
      question: "In which direction does the magnetic force act on the proton?",
      options: [
        { text: "Upward (parallel to B)", correct: false },
        { text: "Downward (opposite to B)", correct: false },
        { text: "Horizontal, perpendicular to both velocity and B", correct: true },
        { text: "Backward, opposing the motion", correct: false }
      ],
      explanation: "The Lorentz force F = qv × B is always perpendicular to both the velocity and the magnetic field. Using the right-hand rule: point fingers along v, curl toward B, thumb points in force direction (perpendicular to both)."
    },
    {
      scenario: "A charged particle enters a uniform magnetic field with velocity perpendicular to the field.",
      question: "What path does the particle follow?",
      options: [
        { text: "Straight line (magnetic fields don't curve paths)", correct: false },
        { text: "Circular arc (constant perpendicular force)", correct: true },
        { text: "Parabola (like projectile motion)", correct: false },
        { text: "Spiral that loses energy", correct: false }
      ],
      explanation: "The magnetic force is always perpendicular to velocity, so it acts as a centripetal force. The result is circular motion. Since the force is always perpendicular to motion, no work is done and speed remains constant."
    },
    {
      scenario: "Two parallel wires carry current in the same direction. Students observe they move toward each other.",
      question: "Why do parallel currents attract?",
      options: [
        { text: "Electric fields from the currents attract", correct: false },
        { text: "Each wire's field exerts a force on the other wire's current", correct: true },
        { text: "Gravitational attraction between the wires", correct: false },
        { text: "This is wrong; parallel currents repel", correct: false }
      ],
      explanation: "Wire 1 creates a magnetic field at Wire 2. The current in Wire 2 experiences F = BIL in this field. By the right-hand rule, this force points toward Wire 1. The same logic shows Wire 1 is pulled toward Wire 2. Parallel currents attract!"
    },
    {
      scenario: "A scientist wraps 1000 turns of wire tightly around a 10 cm tube and passes 2 amperes through it.",
      question: "What has she created?",
      options: [
        { text: "A capacitor storing electric charge", correct: false },
        { text: "A solenoid creating a uniform internal magnetic field", correct: true },
        { text: "A transformer stepping up voltage", correct: false },
        { text: "A generator producing AC current", correct: false }
      ],
      explanation: "A tightly wound coil of wire is a solenoid. Inside, it creates a nearly uniform magnetic field B = μ₀nI, where n is turns per unit length. This is the basis for electromagnets."
    },
    {
      scenario: "An electron moving at 1×10⁷ m/s enters a 0.5 T magnetic field at 90° to the field direction.",
      question: "What is the approximate magnitude of the force on the electron?",
      options: [
        { text: "8 × 10⁻¹³ N", correct: true },
        { text: "8 × 10⁻¹⁹ N", correct: false },
        { text: "1.6 × 10⁻¹⁹ N", correct: false },
        { text: "5 × 10⁶ N", correct: false }
      ],
      explanation: "F = qvB sin(θ) = (1.6×10⁻¹⁹ C)(1×10⁷ m/s)(0.5 T)(sin 90°) = 8×10⁻¹³ N. This tiny force is significant for the low-mass electron, causing substantial acceleration."
    },
    {
      scenario: "A bar magnet is suspended and allowed to rotate freely. It settles pointing roughly north-south.",
      question: "What does this tell us about Earth?",
      options: [
        { text: "Earth has an electric field pointing north", correct: false },
        { text: "Earth has its own magnetic field, like a giant bar magnet", correct: true },
        { text: "Gravity is stronger in the north", correct: false },
        { text: "The magnet is attracted to geographic north by electrostatics", correct: false }
      ],
      explanation: "Earth acts like a giant bar magnet (actually generated by convection currents in the molten outer core). A compass needle is a small magnet that aligns with Earth's field, pointing approximately toward the magnetic poles."
    },
    {
      scenario: "A charged particle moves parallel to a magnetic field (velocity and field in the same direction).",
      question: "What force does it experience?",
      options: [
        { text: "Maximum force (aligned with field)", correct: false },
        { text: "Zero force (sin 0° = 0)", correct: true },
        { text: "Half the maximum force", correct: false },
        { text: "It depends on the charge sign", correct: false }
      ],
      explanation: "The Lorentz force F = qv × B involves the cross product. When v and B are parallel (θ = 0°), sin(0°) = 0, so the force is zero. Magnetic forces only act on the component of velocity perpendicular to the field."
    },
    {
      scenario: "MRI machines use magnetic fields of 1.5 to 3 Tesla, while Earth's field is about 50 microtesla.",
      question: "How many times stronger is an MRI field compared to Earth's field?",
      options: [
        { text: "About 30 times stronger", correct: false },
        { text: "About 3,000 times stronger", correct: false },
        { text: "About 30,000 to 60,000 times stronger", correct: true },
        { text: "About the same strength", correct: false }
      ],
      explanation: "MRI field: 1.5 T = 1,500,000 μT. Earth's field: 50 μT. Ratio: 1,500,000/50 = 30,000 times. At 3 T, it's 60,000 times stronger! This extreme field strength is why MRI rooms require special metal-free zones."
    }
  ];

  // Real-world applications
  const applications: TransferApp[] = [
    {
      icon: "🏥",
      title: "MRI Medical Imaging",
      short: "MRI Scanners",
      tagline: "Seeing inside the body without radiation",
      description: "Magnetic Resonance Imaging uses powerful magnetic fields to align hydrogen atoms in the body, then detects signals as they return to equilibrium.",
      connection: "The superconducting electromagnet creates a uniform field 30,000+ times stronger than Earth's, causing proton spins to align predictably for imaging.",
      howItWorks: [
        "Superconducting coils create a powerful, uniform magnetic field (1.5-7 Tesla)",
        "Hydrogen protons in body tissue align with the field",
        "Radio pulses temporarily disturb this alignment",
        "As protons relax back, they emit detectable radio signals",
        "Signal patterns reveal tissue structure with millimeter precision"
      ],
      stats: [
        { value: "3 T", label: "Typical clinical field strength" },
        { value: "~$3M", label: "Cost of one MRI machine" },
        { value: "40M+", label: "MRI scans per year in US" },
        { value: "0.1 mm", label: "Best resolution achievable" }
      ],
      examples: [
        "Brain tumor detection",
        "Spinal cord injury assessment",
        "Joint and soft tissue imaging",
        "Cardiac function analysis"
      ],
      companies: ["Siemens Healthineers", "GE Healthcare", "Philips", "Canon Medical"],
      futureImpact: "Ultra-high-field 7T MRI is enabling visualization of individual brain cell layers, while portable low-field MRI could bring imaging to ambulances and remote areas.",
      color: "from-blue-600 to-cyan-600"
    },
    {
      icon: "🚄",
      title: "Maglev Transportation",
      short: "Maglev Trains",
      tagline: "Flying on magnetic cushions",
      description: "Magnetic levitation trains float above their tracks using powerful magnetic fields, eliminating friction and enabling speeds over 600 km/h.",
      connection: "Superconducting magnets on the train interact with track coils through the Lorentz force, creating both levitation and propulsion without physical contact.",
      howItWorks: [
        "Superconducting magnets on train create strong persistent currents",
        "Moving magnets induce currents in track coils (Faraday's law)",
        "Induced currents create magnetic fields opposing the train's magnets",
        "Repulsive force lifts the train 10-15 cm above the guideway",
        "Linear motor propulsion pushes the train forward using alternating fields"
      ],
      stats: [
        { value: "603 km/h", label: "World record speed (Japan)" },
        { value: "10 cm", label: "Levitation height" },
        { value: "500 km", label: "Tokyo-Osaka Chuo Shinkansen" },
        { value: "~85%", label: "Energy efficiency vs. air travel" }
      ],
      examples: [
        "Shanghai Maglev (430 km/h commercial)",
        "Japan SCMaglev (test runs)",
        "Inductrack passive levitation",
        "Hyperloop magnetic suspension concepts"
      ],
      companies: ["JR Central", "CRRC", "Transrapid", "Virgin Hyperloop"],
      futureImpact: "Combining maglev with vacuum tubes (hyperloop) could achieve near-supersonic ground transport, while urban maglev pods could revolutionize city transit.",
      color: "from-purple-600 to-indigo-600"
    },
    {
      icon: "🔬",
      title: "Particle Accelerators",
      short: "Particle Physics",
      tagline: "Bending beams at near light speed",
      description: "Massive magnets curve the paths of subatomic particles traveling at 99.9999% the speed of light, enabling discoveries about the fundamental nature of matter.",
      connection: "The Lorentz force F = qv × B provides the centripetal force needed to bend charged particles in circular or spiral paths without slowing them down.",
      howItWorks: [
        "Particles are accelerated to near-light speeds in a beam",
        "Dipole magnets use the Lorentz force to bend the beam in a circle",
        "Quadrupole magnets focus the beam to prevent spreading",
        "Superconducting magnets achieve fields up to 8 Tesla",
        "Precise field control steers billions of particles per second"
      ],
      stats: [
        { value: "8.3 T", label: "LHC dipole magnet strength" },
        { value: "27 km", label: "LHC circumference" },
        { value: "1232", label: "Dipole magnets in LHC" },
        { value: "~1.9 K", label: "Magnet operating temperature" }
      ],
      examples: [
        "Large Hadron Collider (CERN)",
        "Fermilab Tevatron (historic)",
        "SLAC linear accelerator",
        "Medical proton therapy accelerators"
      ],
      companies: ["CERN", "Fermilab", "Brookhaven", "SLAC"],
      futureImpact: "Next-generation magnets using high-temperature superconductors could enable more powerful, compact accelerators for physics research and cancer treatment.",
      color: "from-amber-600 to-orange-600"
    },
    {
      icon: "🔊",
      title: "Speakers & Microphones",
      short: "Audio Transducers",
      tagline: "Converting electricity to sound and back",
      description: "Every speaker and dynamic microphone uses the force on a current-carrying coil in a magnetic field to convert between electrical signals and sound waves.",
      connection: "The force F = BIL on the voice coil in the permanent magnet's field moves the cone, creating pressure waves. Microphones work in reverse: cone motion induces current.",
      howItWorks: [
        "Permanent magnet creates a strong radial magnetic field",
        "Voice coil wrapped around cylindrical core sits in this field",
        "Audio current flows through coil, creating force F = BIL",
        "Force moves the coil and attached speaker cone",
        "Cone motion creates sound pressure waves in air"
      ],
      stats: [
        { value: "~1 T", label: "Typical speaker magnet field" },
        { value: "20-20k Hz", label: "Human hearing range" },
        { value: ">90 dB", label: "High-efficiency speaker output" },
        { value: "~1%", label: "Electrical to acoustic efficiency" }
      ],
      examples: [
        "Home audio speakers",
        "Headphones and earbuds",
        "PA and concert systems",
        "Dynamic microphones (SM58, etc.)"
      ],
      companies: ["JBL", "Bose", "Shure", "Sennheiser"],
      futureImpact: "Planar magnetic and electrostatic technologies offer improved fidelity, while bone conduction and parametric speakers use alternative magnetic configurations for unique applications.",
      color: "from-emerald-600 to-teal-600"
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  // Calculate current field values
  const currentField = calculateWireField(wireCurrent, wireDistance);
  const currentForce = calculateLorentzForce(chargeValue, chargeVelocity, currentField, fieldAngle);

  // Render magnetic field visualization
  const renderFieldVisualization = (width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;

    return (
      <svg width={width} height={height} className="mx-auto">
        <defs>
          <linearGradient id="wireGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <marker id="fieldArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#60a5fa" />
          </marker>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill="#1e293b" rx="8" />

        {/* Current direction indicator */}
        <text x={centerX} y="25" textAnchor="middle" fill="#94a3b8" fontSize="11">
          Current: {wireCurrent.toFixed(1)} A (into page ⊗)
        </text>

        {/* Wire cross-section */}
        <circle cx={centerX} cy={centerY} r="15" fill="url(#wireGrad)" stroke="#fca5a5" strokeWidth="2" />
        <text x={centerX} y={centerY + 4} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">⊗</text>

        {/* Concentric field lines */}
        {showFieldLines && [30, 50, 70, 90, 110].map((r, i) => {
          const fieldStrength = 1 / (r / 30); // Field decreases with distance
          return (
            <g key={i}>
              <circle
                cx={centerX}
                cy={centerY}
                r={r}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={1.5 * fieldStrength}
                strokeDasharray={r > 70 ? "8 4" : "none"}
                opacity={0.5 + 0.3 * fieldStrength}
              />
              {/* Field direction arrows (clockwise for current into page) */}
              {[0, 90, 180, 270].map((angle, j) => {
                const arrowX = centerX + r * Math.cos((angle + animationTime * 30) * Math.PI / 180);
                const arrowY = centerY + r * Math.sin((angle + animationTime * 30) * Math.PI / 180);
                const tangentAngle = angle + 90 + animationTime * 30;
                return (
                  <g key={j} transform={`translate(${arrowX}, ${arrowY}) rotate(${tangentAngle})`}>
                    <path d="M-6,0 L6,0 M3,-3 L6,0 L3,3" stroke="#60a5fa" strokeWidth="1.5" fill="none" />
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Test point */}
        <circle cx={centerX + wireDistance * 1500} cy={centerY} r="6" fill="#22c55e" />
        <text x={centerX + wireDistance * 1500} y={centerY - 12} textAnchor="middle" fill="#22c55e" fontSize="10">
          B = {(currentField * 1e6).toFixed(1)} μT
        </text>

        {/* Distance line */}
        <line
          x1={centerX + 20}
          y1={centerY + 30}
          x2={centerX + wireDistance * 1500}
          y2={centerY + 30}
          stroke="#94a3b8"
          strokeWidth="1"
          strokeDasharray="4 2"
        />
        <text x={centerX + wireDistance * 750 + 10} y={centerY + 45} textAnchor="middle" fill="#94a3b8" fontSize="10">
          r = {(wireDistance * 100).toFixed(1)} cm
        </text>

        {/* Right-hand rule reminder */}
        <g transform={`translate(${width - 70}, ${height - 50})`}>
          <rect x="0" y="0" width="60" height="45" fill="#334155" rx="4" />
          <text x="30" y="15" textAnchor="middle" fill="#94a3b8" fontSize="9">Right Hand</text>
          <text x="30" y="28" textAnchor="middle" fill="#22c55e" fontSize="9">Thumb: I</text>
          <text x="30" y="41" textAnchor="middle" fill="#3b82f6" fontSize="9">Curl: B</text>
        </g>

        {/* Formula */}
        <rect x="10" y={height - 40} width="140" height="30" fill="#0f172a" rx="4" />
        <text x="80" y={height - 20} textAnchor="middle" fill="#f8fafc" fontSize="12" fontFamily="monospace">
          B = μ₀I / (2πr)
        </text>
      </svg>
    );
  };

  // Render Lorentz force visualization
  const renderForceVisualization = (width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate force components
    const forceDirection = fieldAngle === 90 ? 'up' : fieldAngle === 0 ? 'none' : 'angled';

    return (
      <svg width={width} height={height} className="mx-auto">
        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill="#1e293b" rx="8" />

        <text x={centerX} y="20" textAnchor="middle" fill="#94a3b8" fontSize="11">
          Lorentz Force on Moving Charge
        </text>

        {/* Magnetic field (into page) */}
        <g>
          {[...Array(5)].map((_, row) =>
            [...Array(7)].map((_, col) => (
              <g key={`${row}-${col}`}>
                <circle
                  cx={40 + col * 40}
                  cy={50 + row * 35}
                  r="8"
                  fill="#334155"
                  stroke="#3b82f6"
                  strokeWidth="1"
                />
                <text
                  x={40 + col * 40}
                  y={54 + row * 35}
                  textAnchor="middle"
                  fill="#60a5fa"
                  fontSize="12"
                >
                  ⊗
                </text>
              </g>
            ))
          )}
        </g>

        {/* Moving charge */}
        <g transform={`translate(${centerX}, ${centerY})`}>
          {/* Velocity arrow */}
          <line x1="-50" y1="0" x2="50" y2="0" stroke="#22c55e" strokeWidth="3" />
          <polygon points="50,0 40,-8 40,8" fill="#22c55e" />
          <text x="0" y="20" textAnchor="middle" fill="#22c55e" fontSize="11">v (velocity)</text>

          {/* Charge */}
          <circle cx="0" cy="0" r="12" fill="#ef4444" stroke="#fca5a5" strokeWidth="2" />
          <text x="0" y="4" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">+</text>

          {/* Force arrow (perpendicular if θ = 90°) */}
          {fieldAngle > 0 && (
            <g>
              <line x1="0" y1="-15" x2="0" y2="-60" stroke="#f59e0b" strokeWidth="3" />
              <polygon points="0,-60 -8,-50 8,-50" fill="#f59e0b" />
              <text x="0" y="-70" textAnchor="middle" fill="#f59e0b" fontSize="11">F (force)</text>
            </g>
          )}
        </g>

        {/* Field label */}
        <text x={width - 50} y={height - 50} textAnchor="middle" fill="#3b82f6" fontSize="11">
          B (into page)
        </text>

        {/* Formula and values */}
        <rect x="10" y={height - 50} width="180" height="40" fill="#0f172a" rx="4" />
        <text x="100" y={height - 33} textAnchor="middle" fill="#f8fafc" fontSize="11" fontFamily="monospace">
          F = qvB sin(θ)
        </text>
        <text x="100" y={height - 18} textAnchor="middle" fill="#94a3b8" fontSize="10">
          = {currentForce.toExponential(2)} N
        </text>

        {/* Right-hand rule for force */}
        <g transform={`translate(${width - 70}, 40)`}>
          <rect x="0" y="0" width="60" height="55" fill="#334155" rx="4" />
          <text x="30" y="13" textAnchor="middle" fill="#94a3b8" fontSize="9">Right Hand</text>
          <text x="30" y="26" textAnchor="middle" fill="#22c55e" fontSize="9">Fingers: v</text>
          <text x="30" y="39" textAnchor="middle" fill="#3b82f6" fontSize="9">Curl to: B</text>
          <text x="30" y="52" textAnchor="middle" fill="#f59e0b" fontSize="9">Thumb: F</text>
        </g>
      </svg>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-8 px-6">
      {/* Premium badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
        <span className="text-cyan-400/80 text-sm font-medium tracking-wide uppercase">Electromagnetism</span>
      </div>

      {/* Gradient title */}
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-3 bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
        The Invisible Force Fields
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg md:text-xl text-center mb-8 max-w-lg">
        What invisible force reaches through space?
      </p>

      {/* Premium card */}
      <div className="w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        <svg width={isMobile ? 280 : 340} height={180} className="mx-auto mb-4">
          <rect x="0" y="0" width={isMobile ? 280 : 340} height="180" fill="#0f172a" rx="8" />

          {/* Bar magnet */}
          <rect x={isMobile ? 90 : 120} y="70" width="40" height="40" fill="#ef4444" rx="4" />
          <rect x={isMobile ? 130 : 160} y="70" width="40" height="40" fill="#3b82f6" rx="4" />
          <text x={isMobile ? 110 : 140} y="95" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">N</text>
          <text x={isMobile ? 150 : 180} y="95" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">S</text>

          {/* Field lines */}
          <path d={`M ${isMobile ? 90 : 120} 90 Q ${isMobile ? 50 : 70} 50 ${isMobile ? 170 : 200} 90`} fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 2" />
          <path d={`M ${isMobile ? 90 : 120} 90 Q ${isMobile ? 50 : 70} 130 ${isMobile ? 170 : 200} 90`} fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 2" />

          {/* Compass needle */}
          <g transform={`translate(${isMobile ? 50 : 60}, 60)`}>
            <circle r="12" fill="#334155" stroke="#64748b" strokeWidth="1" />
            <line x1="-6" y1="0" x2="6" y2="0" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
            <circle r="2" fill="#64748b" />
          </g>

          <text x={isMobile ? 140 : 170} y="160" textAnchor="middle" fill="#94a3b8" fontSize="10">
            Compasses reveal invisible field lines
          </text>
        </svg>

        <p className="text-gray-300 text-center leading-relaxed">
          A compass needle always points north... but bring a magnet close and it swings away!
        </p>
      </div>

      {/* CTA Button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="group px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 flex items-center gap-2"
      >
        Explore the Magnetic Field
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      {/* Hint text */}
      <p className="text-slate-500 text-sm mt-6">
        Discover how moving charges create magnetic fields
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A wire carries electric current straight up. A compass is placed nearby. The compass needle deflects from north and points in a new direction.
        </p>
        <p className="text-cyan-400 font-medium">
          What shape do the magnetic field lines around the wire have?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Straight lines parallel to the wire' },
          { id: 'B', text: 'Straight lines radiating outward from the wire' },
          { id: 'C', text: 'Concentric circles around the wire' },
          { id: 'D', text: 'Random, chaotic lines with no pattern' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'C'
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
            ✓ Correct! Field lines form <span className="text-cyan-400">concentric circles</span> around the wire!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            This is described by the Biot-Savart Law and can be predicted using the right-hand rule.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all duration-300"
          >
            Explore the Physics →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Magnetic Field Lab</h2>

      {/* Demo selector */}
      <div className="flex gap-2 mb-4">
        <button
          onMouseDown={(e) => { e.preventDefault(); setSelectedDemo('wire'); }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            selectedDemo === 'wire' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
          }`}
        >
          Wire Field
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); setSelectedDemo('force'); }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            selectedDemo === 'force' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
          }`}
        >
          Lorentz Force
        </button>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        {selectedDemo === 'wire'
          ? renderFieldVisualization(isMobile ? 320 : 400, isMobile ? 280 : 320)
          : renderForceVisualization(isMobile ? 320 : 400, isMobile ? 280 : 320)
        }
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-2xl mb-4">
        <button
          onMouseDown={(e) => { e.preventDefault(); setIsAnimating(!isAnimating); }}
          className={`p-3 rounded-xl font-semibold transition-colors ${
            isAnimating ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
          } text-white`}
        >
          {isAnimating ? '⏹ Stop' : '▶ Animate'}
        </button>

        <button
          onMouseDown={(e) => { e.preventDefault(); setShowFieldLines(!showFieldLines); }}
          className={`p-3 rounded-xl font-medium transition-colors ${
            showFieldLines ? 'bg-cyan-600' : 'bg-slate-600'
          } text-white`}
        >
          {showFieldLines ? '🔵 Lines: ON' : '⚪ Lines: OFF'}
        </button>

        {selectedDemo === 'wire' ? (
          <>
            <div className="p-3 bg-slate-700/50 rounded-xl text-center">
              <div className="text-sm text-slate-400">Current (A)</div>
              <input
                type="range"
                min="1"
                max="20"
                value={wireCurrent}
                onChange={(e) => setWireCurrent(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-cyan-400 font-bold">{wireCurrent.toFixed(1)}</div>
            </div>

            <div className="p-3 bg-slate-700/50 rounded-xl text-center">
              <div className="text-sm text-slate-400">Distance (cm)</div>
              <input
                type="range"
                min="1"
                max="20"
                value={wireDistance * 100}
                onChange={(e) => setWireDistance(parseFloat(e.target.value) / 100)}
                className="w-full"
              />
              <div className="text-cyan-400 font-bold">{(wireDistance * 100).toFixed(1)}</div>
            </div>
          </>
        ) : (
          <>
            <div className="p-3 bg-slate-700/50 rounded-xl text-center">
              <div className="text-sm text-slate-400">Angle (°)</div>
              <input
                type="range"
                min="0"
                max="90"
                value={fieldAngle}
                onChange={(e) => setFieldAngle(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-cyan-400 font-bold">{fieldAngle}°</div>
            </div>
          </>
        )}
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Key Equations:</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-300">
          <div>
            <div className="font-mono text-white bg-slate-700 px-3 py-2 rounded mb-2">B = μ₀I / (2πr)</div>
            <p>Field from straight wire decreases with distance</p>
          </div>
          <div>
            <div className="font-mono text-white bg-slate-700 px-3 py-2 rounded mb-2">F = qvB sin(θ)</div>
            <p>Force on moving charge is perpendicular to both v and B</p>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); setIsAnimating(false); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all duration-300"
      >
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Magnetic Fields</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">🧲 Sources of Magnetic Fields</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Moving electric charges (currents)</li>
            <li>• Permanent magnets (aligned electron spins)</li>
            <li>• Changing electric fields</li>
            <li>• Earth's liquid iron core convection</li>
            <li>• B = μ₀I/(2πr) for straight wire</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-3">✋ Right-Hand Rules</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• <strong>Wire:</strong> Thumb = current, fingers curl = B direction</li>
            <li>• <strong>Force:</strong> Fingers = v, curl to B, thumb = F</li>
            <li>• <strong>Solenoid:</strong> Fingers curl with current, thumb = N pole</li>
            <li>• Works for positive charges (reverse for negative)</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">⚡ Lorentz Force</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• F = qv × B (cross product)</li>
            <li>• Force perpendicular to both v and B</li>
            <li>• Maximum when v ⊥ B (sin 90° = 1)</li>
            <li>• Zero when v ∥ B (sin 0° = 0)</li>
            <li>• Causes circular motion for ⊥ entry</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">📐 Field Properties</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Measured in Tesla (T) or Gauss (1 T = 10,000 G)</li>
            <li>• Field lines always form closed loops</li>
            <li>• Lines never cross (direction would be ambiguous)</li>
            <li>• Density of lines indicates field strength</li>
            <li>• Earth's field ≈ 50 μT, MRI ≈ 3 T</li>
          </ul>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Discover a Surprising Twist →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">🌟 The Twist Challenge</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A proton (positive charge) enters a uniform magnetic field traveling perpendicular to the field lines. The magnetic force curves its path into a circle.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          Does the magnetic field do any work on the proton?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Yes - the force accelerates the proton, so work is done' },
          { id: 'B', text: 'No - the force is always perpendicular to motion, so W = 0' },
          { id: 'C', text: 'Yes - the proton gains kinetic energy from the field' },
          { id: 'D', text: 'Only if the field is strong enough' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'B'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'B'
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
            ✓ Magnetic forces never do work on charged particles!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Work = Force × displacement × cos(θ). Since F ⊥ v always, cos(90°) = 0, so W = 0. Speed stays constant; only direction changes!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            See Why This Matters →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">Magnetic Forces Do No Work</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-3xl">
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2 text-center">Circular Motion</h3>
          <svg width="180" height="140" className="mx-auto">
            <rect x="0" y="0" width="180" height="140" fill="#1e293b" rx="8" />

            {/* Circular path */}
            <circle cx="90" cy="70" r="40" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 2" />

            {/* Moving charge */}
            <circle cx="130" cy="70" r="8" fill="#ef4444" />
            <text x="130" y="74" textAnchor="middle" fill="white" fontSize="10">+</text>

            {/* Velocity (tangent) */}
            <line x1="130" y1="70" x2="130" y2="35" stroke="#22c55e" strokeWidth="2" />
            <polygon points="130,35 126,42 134,42" fill="#22c55e" />
            <text x="145" y="50" fill="#22c55e" fontSize="9">v</text>

            {/* Force (toward center) */}
            <line x1="130" y1="70" x2="100" y2="70" stroke="#f59e0b" strokeWidth="2" />
            <polygon points="100,70 107,66 107,74" fill="#f59e0b" />
            <text x="105" y="85" fill="#f59e0b" fontSize="9">F</text>

            <text x="90" y="130" textAnchor="middle" fill="#94a3b8" fontSize="10">F ⊥ v always → W = 0</text>
          </svg>
          <p className="text-center text-sm text-slate-400 mt-2">
            Force is centripetal, never along motion
          </p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-purple-400 mb-2 text-center">Energy Conservation</h3>
          <svg width="180" height="140" className="mx-auto">
            <rect x="0" y="0" width="180" height="140" fill="#1e293b" rx="8" />

            {/* Energy bar (unchanged) */}
            <rect x="30" y="30" width="120" height="30" fill="#334155" rx="4" />
            <rect x="30" y="30" width="120" height="30" fill="#22c55e" rx="4" />
            <text x="90" y="50" textAnchor="middle" fill="white" fontSize="11">KE = ½mv²</text>

            {/* Speed indicator */}
            <text x="90" y="80" textAnchor="middle" fill="#94a3b8" fontSize="11">Speed: CONSTANT</text>

            {/* Before/after comparison */}
            <g transform="translate(40, 100)">
              <circle r="6" fill="#ef4444" />
              <line x1="8" y1="0" x2="25" y2="0" stroke="#22c55e" strokeWidth="2" />
              <text x="35" y="4" fill="#94a3b8" fontSize="9">v₁</text>
            </g>

            <text x="90" y="110" fill="#94a3b8" fontSize="10">=</text>

            <g transform="translate(120, 100)">
              <circle r="6" fill="#ef4444" />
              <line x1="8" y1="0" x2="25" y2="0" stroke="#22c55e" strokeWidth="2" />
              <text x="35" y="4" fill="#94a3b8" fontSize="9">v₂</text>
            </g>
          </svg>
          <p className="text-center text-sm text-slate-400 mt-2">
            No work means no energy change
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-purple-400 mb-3">Why This Is Important:</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• <strong>Particle accelerators:</strong> Magnets steer beams without changing energy—RF cavities do the acceleration</li>
          <li>• <strong>Mass spectrometers:</strong> Radius depends on mass/charge ratio, not energy</li>
          <li>• <strong>Magnetic confinement:</strong> Plasma stays hot because B fields don't drain energy</li>
          <li>• <strong>Cyclotrons:</strong> Same principle—magnets curve, electric fields accelerate</li>
        </ul>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Review the Discovery →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">🌟 Key Discovery</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Magnetic Fields: Steering Without Speeding</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            The perpendicular nature of the magnetic force gives it unique properties:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Can change direction without changing speed</li>
            <li>Perfect for beam steering and focusing</li>
            <li>Enables particle confinement (tokamaks, traps)</li>
            <li>Creates circular/helical motion naturally</li>
            <li>Separates particles by mass (spectrometry)</li>
          </ul>
          <p className="text-emerald-400 font-medium mt-4">
            Understanding this property is key to particle physics, fusion research, and medical imaging!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all duration-300"
      >
        Explore Real-World Applications →
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {applications.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index
                ? 'bg-blue-600 text-white'
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {app.short}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{applications[activeAppTab].icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{applications[activeAppTab].title}</h3>
            <p className="text-cyan-400 text-sm">{applications[activeAppTab].tagline}</p>
          </div>
        </div>

        <p className="text-slate-300 mb-4">{applications[activeAppTab].description}</p>

        <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
          <h4 className="text-sm font-semibold text-cyan-400 mb-2">Physics Connection:</h4>
          <p className="text-sm text-slate-300">{applications[activeAppTab].connection}</p>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-semibold text-white mb-2">How It Works:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-slate-300">
            {applications[activeAppTab].howItWorks.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {applications[activeAppTab].stats.map((stat, i) => (
            <div key={i} className="bg-slate-700/50 rounded-lg p-2 text-center">
              <div className="text-cyan-400 font-bold text-sm">{stat.value}</div>
              <div className="text-slate-400 text-xs">{stat.label}</div>
            </div>
          ))}
        </div>

        {!completedApps.has(activeAppTab) && (
          <button
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
            className="w-full mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
          >
            ✓ Mark as Understood
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">
          {applications.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`}
            />
          ))}
        </div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>

      {completedApps.size >= 4 && (
        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all duration-300"
        >
          Take the Knowledge Test →
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>

      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <div className="bg-slate-700/50 rounded-lg p-3 mb-3">
                <p className="text-cyan-400 text-sm italic">{q.scenario}</p>
              </div>
              <p className="text-white font-medium mb-3">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onMouseDown={(e) => { e.preventDefault(); setShowTestResults(true); playSound('complete'); }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Score: {calculateScore()}/10
            </h3>
            <p className="text-slate-300">
              {calculateScore() >= 7
                ? 'Excellent! You\'ve mastered magnetic fields!'
                : 'Keep studying! Review the concepts and try again.'}
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {testQuestions.map((q, qIndex) => {
              const isCorrect = q.options[testAnswers[qIndex]]?.correct;
              return (
                <div key={qIndex} className={`p-3 rounded-lg ${isCorrect ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <span className="text-sm text-slate-300">Question {qIndex + 1}</span>
                  </div>
                  <p className="text-xs text-slate-400">{q.explanation}</p>
                </div>
              );
            })}
          </div>

          {calculateScore() >= 7 ? (
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }}
              className="w-full px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
            >
              Claim Your Mastery Badge →
            </button>
          ) : (
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase(3); }}
              className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all duration-300"
            >
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-blue-900/50 via-indigo-900/50 to-purple-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🧲</div>
        <h1 className="text-3xl font-bold text-white mb-4">Magnetic Field Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the physics of magnetic fields and forces!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⭕</div>
            <p className="text-sm text-slate-300">Circular Field Lines</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">✋</div>
            <p className="text-sm text-slate-300">Right-Hand Rule</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-sm text-slate-300">Lorentz Force</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔄</div>
            <p className="text-sm text-slate-300">Circular Motion</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(0); }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            ↺ Explore Again
          </button>
        </div>
      </div>
    </div>
  );

  const renderPhase = () => {
    switch (phase) {
      case 0: return renderHook();
      case 1: return renderPredict();
      case 2: return renderPlay();
      case 3: return renderReview();
      case 4: return renderTwistPredict();
      case 5: return renderTwistPlay();
      case 6: return renderTwistReview();
      case 7: return renderTransfer();
      case 8: return renderTest();
      case 9: return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Ambient background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Premium progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/70 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-400">Magnetic Fields</span>
            <span className="text-sm text-slate-500">{phaseNames[phase]}</span>
          </div>
          {/* Phase dots */}
          <div className="flex justify-between px-1">
            {phaseNames.map((_, i) => (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(i); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i <= phase
                    ? 'bg-cyan-500'
                    : 'bg-slate-700'
                } ${i === phase ? 'w-6' : 'w-2'}`}
                title={phaseNames[i]}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="pt-20 pb-8 relative z-10">
        {renderPhase()}
      </div>
    </div>
  );
};

export default MagneticFieldRenderer;
