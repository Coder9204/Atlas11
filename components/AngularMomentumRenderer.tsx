'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ─────────────────────────────────────────────────────────────────────────────
// Angular Momentum Conservation - Complete 10-Phase Game
// Why figure skaters spin faster when they pull their arms in
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

interface AngularMomentumRendererProps {
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
    scenario: "A figure skater begins a spin with arms extended, rotating at 2 revolutions per second. She then pulls her arms tightly against her body, reducing her moment of inertia by half.",
    question: "What happens to her rotational speed?",
    options: [
      { id: 'a', label: "She slows down to 1 rev/s because she's using energy to pull arms in" },
      { id: 'b', label: "She speeds up to 4 rev/s because angular momentum is conserved", correct: true },
      { id: 'c', label: "She maintains 2 rev/s because the ice is frictionless" },
      { id: 'd', label: "She speeds up to 3 rev/s due to reduced air resistance" }
    ],
    explanation: "When moment of inertia (I) is halved, angular velocity (omega) must double to keep angular momentum (L = I * omega) constant. Since she started at 2 rev/s, she ends at 4 rev/s."
  },
  {
    scenario: "A diver jumps from a 10-meter platform, initially in a straight layout position. During the dive, she tucks into a tight ball to perform multiple somersaults before straightening out to enter the water.",
    question: "Why does tucking help complete more rotations?",
    options: [
      { id: 'a', label: "Tucking reduces air resistance, allowing faster rotation" },
      { id: 'b', label: "Tucking reduces moment of inertia, so angular velocity increases to conserve momentum", correct: true },
      { id: 'c', label: "Tucking adds rotational energy from muscle contraction" },
      { id: 'd', label: "Gravity accelerates tucked bodies faster than extended ones" }
    ],
    explanation: "In a tuck position, the diver's mass is closer to the rotation axis, dramatically reducing moment of inertia. Since angular momentum cannot change during flight (no external torques), angular velocity must increase proportionally."
  },
  {
    scenario: "Engineers at NASA are designing a spacecraft that needs to rotate to orient its solar panels. They're considering using internal reaction wheels versus external thrusters.",
    question: "Why are reaction wheels preferred for routine attitude adjustments?",
    options: [
      { id: 'a', label: "Reaction wheels are cheaper to manufacture than thrusters" },
      { id: 'b', label: "Spinning wheels transfer angular momentum to the spacecraft without expelling propellant", correct: true },
      { id: 'c', label: "Thrusters cannot work in the vacuum of space" },
      { id: 'd', label: "Reaction wheels generate electrical power while spinning" }
    ],
    explanation: "Reaction wheels exploit conservation of angular momentum internally. When a wheel spins faster in one direction, the spacecraft rotates in the opposite direction. No propellant is consumed, making this sustainable for decades of operation."
  },
  {
    scenario: "A star collapses at the end of its life, shrinking from a radius of 700,000 km to become a neutron star with a radius of just 10 km. The original star rotated once every 30 days.",
    question: "What happens to the neutron star's rotation rate?",
    options: [
      { id: 'a', label: "It rotates at the same rate - 30 days per rotation" },
      { id: 'b', label: "It rotates much slower due to the immense gravitational compression" },
      { id: 'c', label: "It rotates extremely fast - potentially hundreds of times per second", correct: true },
      { id: 'd', label: "Rotation stops completely as the star collapses" }
    ],
    explanation: "With radius decreasing by a factor of 70,000, moment of inertia decreases enormously (proportional to r-squared). To conserve angular momentum, rotation rate must increase by approximately the same factor, resulting in millisecond rotation periods."
  },
  {
    scenario: "A physics teacher sits on a rotating stool holding a spinning bicycle wheel with its axis horizontal. She then tilts the wheel so its axis becomes vertical.",
    question: "What happens to the teacher on the stool?",
    options: [
      { id: 'a', label: "Nothing changes - the stool remains stationary" },
      { id: 'b', label: "The teacher begins rotating on the stool to conserve the system's total angular momentum", correct: true },
      { id: 'c', label: "The wheel stops spinning completely" },
      { id: 'd', label: "The teacher is pushed sideways by gyroscopic force" }
    ],
    explanation: "When the wheel's angular momentum vector changes direction from horizontal to vertical, the teacher must acquire angular momentum in the opposite vertical direction. The total system angular momentum remains constant, causing her to rotate."
  },
  {
    scenario: "A helicopter's main rotor spins counterclockwise when viewed from above. Without any counter-torque system, the helicopter body would spin in the opposite direction.",
    question: "What is the purpose of the tail rotor?",
    options: [
      { id: 'a', label: "To provide forward thrust for horizontal flight" },
      { id: 'b', label: "To counteract the torque from the main rotor and prevent the body from spinning", correct: true },
      { id: 'c', label: "To cool the engine by creating airflow" },
      { id: 'd', label: "To provide lift during hovering" }
    ],
    explanation: "By Newton's third law, the main rotor exerts a reaction torque on the helicopter body. The tail rotor produces a sideways thrust that creates an equal and opposite torque, maintaining angular momentum balance and keeping the body from spinning."
  },
  {
    scenario: "An ice dancer performs a spin while holding heavy 2 kg weights in each hand. During the spin, she drops both weights outward.",
    question: "What happens to her rotation after dropping the weights?",
    options: [
      { id: 'a', label: "She speeds up because she's now lighter" },
      { id: 'b', label: "She slows down because the weights carried angular momentum away", correct: true },
      { id: 'c', label: "Her speed stays the same because she only changed mass, not configuration" },
      { id: 'd', label: "She stops spinning immediately" }
    ],
    explanation: "When the weights are dropped outward, they carry away their share of the system's angular momentum. The dancer retains less angular momentum, so even though her moment of inertia decreased, her angular velocity also decreases."
  },
  {
    scenario: "A cat always lands on its feet when dropped. High-speed cameras show that during a fall, the cat twists its body in a specific sequence without any external surface to push against.",
    question: "How does a cat rotate in mid-air without violating conservation of angular momentum?",
    options: [
      { id: 'a', label: "The cat pushes against air molecules to generate rotation" },
      { id: 'b', label: "The cat changes its moment of inertia differently for different body parts, enabling net rotation while total L stays zero", correct: true },
      { id: 'c', label: "The cat stores angular momentum in its tail" },
      { id: 'd', label: "Conservation of angular momentum doesn't apply to falling cats" }
    ],
    explanation: "The cat bends its spine, creating two body segments. By extending legs on one side while retracting on the other, it rotates the front half independently of the back half. The total angular momentum remains zero throughout, but the cat still manages to reorient."
  },
  {
    scenario: "A merry-go-round (rotational inertia 500 kg*m^2) rotates at 0.5 rad/s. A 50 kg child runs tangentially and jumps onto the edge at radius 2 m, initially moving at 4 m/s in the same direction.",
    question: "How does the merry-go-round's speed change?",
    options: [
      { id: 'a', label: "It slows down because the child adds mass" },
      { id: 'b', label: "It speeds up because the child brings in angular momentum", correct: true },
      { id: 'c', label: "It maintains the same speed - conservation of energy" },
      { id: 'd', label: "It depends on where on the platform the child lands" }
    ],
    explanation: "The child brings angular momentum L = mvr = 50 * 4 * 2 = 400 kg*m^2/s. The platform initially has L = I*omega = 500 * 0.5 = 250 kg*m^2/s. Total becomes 650 kg*m^2/s. With new I = 500 + 50*4 = 700 kg*m^2, new omega = 650/700 = 0.93 rad/s. Faster!"
  },
  {
    scenario: "Astronomers observe a pulsar (rapidly rotating neutron star) gradually slowing down from 30 rotations per second to 29 rotations per second over many years. The star's radius hasn't changed.",
    question: "Where does the lost angular momentum go?",
    options: [
      { id: 'a', label: "It converts to heat inside the star" },
      { id: 'b', label: "It radiates away as electromagnetic waves and particle beams", correct: true },
      { id: 'c', label: "Angular momentum simply disappears over time" },
      { id: 'd', label: "It transfers to nearby planets in the system" }
    ],
    explanation: "Pulsars emit intense beams of electromagnetic radiation and charged particle winds from their magnetic poles. These emissions carry away angular momentum, causing the pulsar to spin down over millions of years. Angular momentum is conserved - it's transferred to the radiation field."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '⛸️',
    title: 'Figure Skating & Gymnastics',
    short: 'Athletes control spin speed through body position',
    tagline: 'From 2 to 6 rotations per second in an instant',
    description: 'Figure skaters and gymnasts routinely exploit angular momentum conservation to perform spectacular spins. By changing their body configuration, athletes can increase or decrease their rotation rate at will, creating the beautiful, dynamic movements that define these sports.',
    connection: 'When a skater pulls their arms from extended (high moment of inertia) to tucked (low moment of inertia), angular momentum L = I times omega stays constant. Halving I doubles omega. This is pure physics in action.',
    howItWorks: 'The skater initiates rotation with arms and one leg extended, building angular momentum from the ice. Once airborne or on one skate, no external torque can change L. By pulling limbs inward, I decreases dramatically - arm position alone can change I by 3x. Angular velocity increases proportionally, reaching 300+ RPM in elite skaters.',
    stats: [
      { value: '342 RPM', label: 'World record spin', icon: '🏆' },
      { value: '3-4x', label: 'Speed increase possible', icon: '⚡' },
      { value: '<0.3s', label: 'Arm pull duration', icon: '⏱️' }
    ],
    examples: [
      'Scratch spin - arms extended to tucked transition',
      'Flying camel - horizontal leg changes I distribution',
      'Biellmann spin - overhead leg creates distinctive silhouette',
      'Quadruple jumps - tucked rotation for 4 revolutions in 0.7s'
    ],
    companies: [
      'International Skating Union (ISU)',
      'US Figure Skating',
      'Federation Internationale de Gymnastique',
      'Cirque du Soleil'
    ],
    futureImpact: 'Biomechanical analysis with motion capture is helping athletes optimize body positions for maximum speed and aesthetic appeal, potentially enabling quintuple jumps.',
    color: '#60A5FA'
  },
  {
    icon: '🛰️',
    title: 'Spacecraft Attitude Control',
    short: 'Satellites rotate without using fuel',
    tagline: 'Steering through space with spinning wheels',
    description: 'Spacecraft use internal reaction wheels to orient themselves in the vacuum of space. By spinning wheels in one direction, the satellite body rotates in the opposite direction - all without expelling a single molecule of propellant.',
    connection: 'In space, there are no external torques to change angular momentum. The spacecraft-plus-wheels system has zero total L. When a wheel speeds up (gaining +L), the spacecraft gains equal -L and rotates oppositely. This is pure angular momentum exchange.',
    howItWorks: 'Three or more reaction wheels are mounted along perpendicular axes. Each wheel can spin at variable speeds (typically 0-6000 RPM). To rotate the spacecraft clockwise, spin the appropriate wheel counterclockwise. Computer control achieves arcsecond pointing precision. Control moment gyroscopes (CMGs) provide even higher torque by tilting spinning gyroscopes.',
    stats: [
      { value: '0.001°', label: 'Pointing precision', icon: '🎯' },
      { value: '20+ yrs', label: 'Operational life', icon: '📅' },
      { value: '6000 RPM', label: 'Wheel speed', icon: '⚙️' }
    ],
    examples: [
      'Hubble Space Telescope - 4 reaction wheels for mirror pointing',
      'James Webb Space Telescope - maintains perfect sun alignment',
      'International Space Station - 4 CMGs for 420-ton station',
      'Mars rovers - orient antennas for Earth communication'
    ],
    companies: [
      'NASA / JPL',
      'SpaceX',
      'Honeywell Aerospace',
      'Collins Aerospace',
      'Northrop Grumman'
    ],
    futureImpact: 'Superconducting magnetic bearings will eliminate friction in reaction wheels, enabling centuries of maintenance-free attitude control for interstellar probes.',
    color: '#A855F7'
  },
  {
    icon: '🌟',
    title: 'Neutron Stars & Pulsars',
    short: 'Stars that spin 716 times per second',
    tagline: 'Cosmic figure skaters on the grandest scale',
    description: 'When massive stars collapse, they conserve their angular momentum while shrinking by a factor of 100,000 in radius. The result: neutron stars spinning at mind-boggling rates, with surfaces moving at significant fractions of the speed of light.',
    connection: 'Moment of inertia I scales as mass times radius squared. When a star shrinks from 700,000 km to 10 km radius, I decreases by (70,000)^2 = 5 billion times. To conserve L, rotation rate increases by the same factor - turning monthly rotations into millisecond periods.',
    howItWorks: 'A dying massive star collapses when fusion stops. The core implodes in seconds, conserving angular momentum. The resulting neutron star spins rapidly, its intense magnetic field sweeping through space like a lighthouse beam. These pulsars emit radio waves, X-rays, and gamma rays detectable across the galaxy.',
    stats: [
      { value: '716 Hz', label: 'Fastest known pulsar', icon: '⚡' },
      { value: '24% c', label: 'Surface velocity', icon: '🚀' },
      { value: '10^15 G', label: 'Magnetic field', icon: '🧲' }
    ],
    examples: [
      'PSR J1748-2446ad - fastest known pulsar at 716 Hz',
      'Crab Pulsar - 30 Hz spin, visible in optical telescopes',
      'Vela Pulsar - navigation beacon for spacecraft',
      'Magnetars - neutron stars with extreme magnetic fields'
    ],
    companies: [
      'LIGO Scientific Collaboration',
      'Event Horizon Telescope',
      'NASA Fermi Gamma-ray Telescope',
      'CSIRO Parkes Observatory'
    ],
    futureImpact: 'Pulsar timing arrays may detect gravitational waves, and pulsar navigation could guide spacecraft across the galaxy with GPS-like precision.',
    color: '#F59E0B'
  },
  {
    icon: '🔋',
    title: 'Flywheel Energy Storage',
    short: 'Storing power in pure rotation',
    tagline: 'Angular momentum meets the power grid',
    description: 'Flywheel batteries store energy as rotational kinetic energy, exploiting the relationship E = (1/2) I omega^2. These systems can absorb and release power in milliseconds, providing grid stabilization far faster than chemical batteries.',
    connection: 'A flywheel stores both energy (E proportional to omega squared) and angular momentum (L proportional to omega). The rotational inertia provides stability - like a spinning top resisting disturbances. Energy is extracted by slowing the flywheel, reducing both L and E.',
    howItWorks: 'Modern flywheels use carbon fiber composite rotors spinning at 20,000-50,000 RPM in vacuum chambers. Magnetic bearings eliminate friction. A motor-generator accelerates the rotor to store energy and decelerates it to release power. Response time is milliseconds, making flywheels ideal for frequency regulation and power quality.',
    stats: [
      { value: '50,000 RPM', label: 'Maximum speed', icon: '🔄' },
      { value: '<4 ms', label: 'Response time', icon: '⚡' },
      { value: '20+ yrs', label: 'Operational life', icon: '📅' }
    ],
    examples: [
      'Beacon Power - 20 MW grid stabilization facility',
      'Formula 1 KERS - regenerative braking energy recovery',
      'UPS systems - bridging power during grid outages',
      'Tokamak fusion reactors - pulsed power delivery'
    ],
    companies: [
      'Beacon Power',
      'Amber Kinetics',
      'Calnetix / Vycon',
      'GKN Hybrid Power'
    ],
    futureImpact: 'Superconducting flywheels may enable hour-scale energy storage with minimal losses, complementing batteries for 100% renewable grids.',
    color: '#10B981'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const AngularMomentumRenderer: React.FC<AngularMomentumRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state - spinning figure
  const [armExtension, setArmExtension] = useState(0.8); // 0 = tucked, 1 = extended
  const [hasWeights, setHasWeights] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Physics constants and calculations
  const bodyInertia = 2.5; // kg*m^2 - core body moment of inertia
  const weightMass = hasWeights ? 2.0 : 0.2; // kg per hand weight
  const armRadius = 0.3 + armExtension * 0.5; // meters from axis
  const momentOfInertia = bodyInertia + 2 * weightMass * armRadius * armRadius;

  // Reference state for conservation
  const initialArmRadius = 0.8; // Reference starting position
  const initialMomentOfInertia = bodyInertia + 2 * weightMass * initialArmRadius * initialArmRadius;
  const initialOmega = 2.0; // Starting angular velocity (rad/s)
  const angularMomentum = initialMomentOfInertia * initialOmega; // Conserved quantity
  const currentOmega = angularMomentum / momentOfInertia; // Current angular velocity

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
  const animationRef = useRef<number>();

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop for frame counter
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Spinning animation
  useEffect(() => {
    if (isSpinning && (phase === 'play' || phase === 'twist_play')) {
      const animate = () => {
        setAngle(prev => (prev + currentOmega * 0.04) % (2 * Math.PI));
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }
  }, [isSpinning, currentOmega, phase]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#8B5CF6', // Purple for angular momentum
    accentGlow: 'rgba(139, 92, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    pink: '#EC4899',
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
    play: 'Play Experiment',
    review: 'Review Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore Effects',
    twist_review: 'Deep Review',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery Complete'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'angular-momentum',
        gameTitle: 'Angular Momentum Conservation',
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

  // Speed ratio for display
  const speedRatio = currentOmega / initialOmega;

  // Spinning Figure SVG Component
  const renderSpinningFigure = () => {
    const width = isMobile ? 340 : 420;
    const height = isMobile ? 340 : 400;
    const centerX = width / 2;
    const centerY = height / 2 - 20;
    const personRotation = angle * 180 / Math.PI;
    const armLength = 20 + armExtension * 50;
    const weightSize = hasWeights ? 14 : 5;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <radialGradient id="spinGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.6" />
            <stop offset="60%" stopColor={colors.accent} stopOpacity="0.2" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bodyGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </radialGradient>
          <radialGradient id="headGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </radialGradient>
          <radialGradient id="weightGrad" cx="30%" cy="25%" r="65%">
            <stop offset="0%" stopColor="#f9a8d4" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#9d174d" />
          </radialGradient>
          <linearGradient id="armGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="vectorGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background grid */}
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke={colors.border} strokeWidth="0.3" strokeOpacity="0.4" />
        </pattern>
        <rect width={width} height={height} fill={`url(#grid)`} />

        {/* Interactive point tracking arm extension */}
        <circle cx={50 + armExtension * (width - 100)} cy={height - 50 - (1 - armExtension) * (height - 100)} r={8} fill={colors.accent} filter="url(#glow)" stroke="#fff" strokeWidth={2} />

        {/* Platform/base */}
        <ellipse cx={centerX} cy={centerY + 100} rx="70" ry="18" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        <rect x={centerX - 8} y={centerY + 40} width="16" height="62" fill="url(#armGrad)" rx="3" />

        {/* Spin glow when spinning */}
        {isSpinning && (
          <ellipse
            cx={centerX}
            cy={centerY}
            rx={75 + armLength}
            ry={28 + armLength / 3}
            fill="url(#spinGlow)"
          >
            <animate attributeName="opacity" values="0.4;0.7;0.4" dur="0.5s" repeatCount="indefinite" />
          </ellipse>
        )}

        {/* Angular momentum vector L pointing up when spinning */}
        {isSpinning && (
          <g filter="url(#glow)">
            <line x1={centerX} y1={centerY - 50} x2={centerX} y2={centerY - 110} stroke="url(#vectorGrad)" strokeWidth="4" strokeLinecap="round" />
            <polygon points={`${centerX},${centerY - 120} ${centerX - 8},${centerY - 104} ${centerX},${centerY - 110} ${centerX + 8},${centerY - 104}`} fill="url(#vectorGrad)" />
            <text x={centerX + 15} y={centerY - 105} fill={colors.accent} fontSize="14" fontWeight="bold">L</text>
            <circle cx={centerX} cy={centerY - 120} r="5" fill="#c084fc" fillOpacity="0.5">
              <animate attributeName="r" values="3;7;3" dur="1s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {/* Rotating figure */}
        <g transform={`translate(${centerX}, ${centerY}) rotate(${personRotation})`}>
          {/* Motion trail when fast */}
          {isSpinning && speedRatio > 1.3 && (
            <ellipse cx="0" cy="2" rx={armLength + 30} ry="8" fill={colors.accent} opacity="0.2">
              <animate attributeName="opacity" values="0.1;0.25;0.1" dur="0.3s" repeatCount="indefinite" />
            </ellipse>
          )}

          {/* Body */}
          <ellipse cx="0" cy="15" rx="24" ry="35" fill="url(#bodyGrad)" />

          {/* Head */}
          <circle cx="0" cy="-28" r="20" fill="url(#headGrad)" />
          <ellipse cx="-5" cy="-32" rx="6" ry="4" fill="#cbd5e1" fillOpacity="0.2" />

          {/* Eyes */}
          <circle cx="-6" cy="-30" r="3" fill="#0f172a" />
          <circle cx="6" cy="-30" r="3" fill="#0f172a" />
          <circle cx="-7" cy="-31" r="1" fill="#94a3b8" />
          <circle cx="5" cy="-31" r="1" fill="#94a3b8" />

          {/* Left arm */}
          <line x1="-20" y1="0" x2={-20 - armLength} y2="0" stroke="url(#armGrad)" strokeWidth="9" strokeLinecap="round" />
          <circle cx={-20 - armLength} cy="0" r={weightSize} fill={hasWeights ? "url(#weightGrad)" : "#64748b"} filter={hasWeights ? "url(#glow)" : undefined} />
          {hasWeights && (
            <ellipse cx={-20 - armLength - weightSize * 0.25} cy={-weightSize * 0.3} rx={weightSize * 0.25} ry={weightSize * 0.15} fill="white" fillOpacity="0.3" />
          )}

          {/* Right arm */}
          <line x1="20" y1="0" x2={20 + armLength} y2="0" stroke="url(#armGrad)" strokeWidth="9" strokeLinecap="round" />
          <circle cx={20 + armLength} cy="0" r={weightSize} fill={hasWeights ? "url(#weightGrad)" : "#64748b"} filter={hasWeights ? "url(#glow)" : undefined} />
          {hasWeights && (
            <ellipse cx={20 + armLength - weightSize * 0.25} cy={-weightSize * 0.3} rx={weightSize * 0.25} ry={weightSize * 0.15} fill="white" fillOpacity="0.3" />
          )}
        </g>

        {/* Educational Labels */}
        <text x={width / 2} y={height - 20} textAnchor="middle" fill={colors.textMuted} fontSize="12">
          Arm position: {armExtension < 0.3 ? 'Tucked' : armExtension > 0.7 ? 'Extended' : 'Mid'}
        </text>

        {/* Legend panel */}
        <g transform={`translate(${width - 120}, 20)`}>
          <rect x="0" y="0" width="110" height="80" fill={colors.bgSecondary} rx="6" opacity="0.9" />
          <text x="10" y="18" fill={colors.textPrimary} fontSize="11" fontWeight="bold">Legend</text>
          <circle cx="18" cy="35" r="6" fill={colors.accent} />
          <text x="30" y="39" fill={colors.textSecondary} fontSize="11">Angular Momentum L</text>
          <circle cx="18" cy="55" r="6" fill={colors.pink} />
          <text x="30" y="59" fill={colors.textSecondary} fontSize="11">Weights (mass)</text>
          <line x1="12" y1="70" x2="24" y2="70" stroke={colors.success} strokeWidth="2" />
          <text x="30" y="74" fill={colors.textSecondary} fontSize="11">Rotation axis</text>
        </g>

        {/* Grid lines for visual reference */}
        <line x1="50" y1="30" x2={width - 50} y2="30" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
        <line x1="50" y1={height - 30} x2={width - 50} y2={height - 30} stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
        <line x1="50" y1={height / 2} x2={width - 50} y2={height / 2} stroke="#334155" strokeDasharray="4 4" opacity="0.3" />

        {/* Direct labels on objects */}
        <text x={centerX + 80} y={centerY + 105} fill={colors.textSecondary} fontSize="11">Spinning Platform</text>
        <text x={centerX - 100} y={centerY - 60} fill={colors.textSecondary} fontSize="11">Rotation Center</text>
        {hasWeights && (
          <text x={centerX} y={centerY + 60} textAnchor="middle" fill={colors.pink} fontSize="11">Mass = {weightMass} kg</text>
        )}

        {/* Formula */}
        <text x={15} y={height - 12} fill={colors.accent} fontSize="12" fontWeight="bold">L = I × ω</text>
      </svg>
    );
  };

  // Progress bar component
  const renderProgressBar = () => (
    <header style={{
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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.pink})`,
        transition: 'width 0.3s ease',
      }} />
    </header>
  );

  // Previous phase helper
  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Bottom navigation bar with dots, back and next buttons
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;

    return (
      <nav style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgCard,
        borderTop: `1px solid ${colors.border}`,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
      }}>
        {/* Back button */}
        <button
          onClick={prevPhase}
          disabled={isFirst}
          style={{
            minHeight: '48px',
            padding: '12px 20px',
            borderRadius: '10px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: isFirst ? colors.textMuted : colors.textSecondary,
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: isFirst ? 0.5 : 1,
          }}
        >
          Back
        </button>

        {/* Navigation dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '4px',
        }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              style={{
                width: '44px',
                height: '44px',
                minHeight: '44px',
                borderRadius: '22px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
              aria-label={phaseLabels[p]}
            >
              <span style={{
                width: phase === p ? '20px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
                transition: 'all 0.3s ease',
              }} />
            </button>
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={nextPhase}
          disabled={isLast}
          style={{
            minHeight: '48px',
            padding: '12px 20px',
            borderRadius: '10px',
            border: 'none',
            background: isLast ? colors.border : colors.accent,
            color: 'white',
            cursor: isLast ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: isLast ? 0.5 : 1,
          }}
        >
          Next
        </button>
      </nav>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.pink})`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
  };

  // Stats display component
  const renderStatsDisplay = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
      marginTop: '16px',
    }}>
      <div style={{
        background: colors.bgSecondary,
        borderRadius: '8px',
        padding: '12px',
        textAlign: 'center',
      }}>
        <div style={{ ...typo.h3, color: colors.accent }}>{currentOmega.toFixed(1)} rad/s</div>
        <div style={{ ...typo.small, color: colors.textMuted }}>Angular Velocity</div>
      </div>
      <div style={{
        background: colors.bgSecondary,
        borderRadius: '8px',
        padding: '12px',
        textAlign: 'center',
      }}>
        <div style={{ ...typo.h3, color: colors.warning }}>{momentOfInertia.toFixed(2)} kg*m2</div>
        <div style={{ ...typo.small, color: colors.textMuted }}>Moment of Inertia</div>
      </div>
      <div style={{
        background: speedRatio > 1.2 ? `${colors.success}22` : colors.bgSecondary,
        borderRadius: '8px',
        padding: '12px',
        textAlign: 'center',
        border: speedRatio > 1.2 ? `1px solid ${colors.success}44` : 'none',
      }}>
        <div style={{ ...typo.h3, color: speedRatio > 1.2 ? colors.success : colors.textPrimary }}>{speedRatio.toFixed(2)}x</div>
        <div style={{ ...typo.small, color: colors.textMuted }}>Speed Gain</div>
      </div>
    </div>
  );

  // Angular momentum display
  const renderAngularMomentumDisplay = () => (
    <div style={{
      background: `${colors.accent}11`,
      border: `1px solid ${colors.accent}33`,
      borderRadius: '12px',
      padding: '16px',
      marginTop: '16px',
      textAlign: 'center',
    }}>
      <div style={{ ...typo.small, color: colors.accent, fontWeight: 600, letterSpacing: '0.05em', marginBottom: '4px' }}>
        ANGULAR MOMENTUM (CONSERVED)
      </div>
      <div style={{ ...typo.h3, color: colors.accent }}>
        L = {angularMomentum.toFixed(2)} kg*m2/s
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        zIndex: 1,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          paddingBottom: '16px',
          textAlign: 'center',
        }}>

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          ⛸️🔄
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          The Spinning Secret
        </h1>

        <p
          className="text-secondary-muted"
          style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Watch any figure skater perform a spin. They start slowly with arms outstretched, then pull their arms in and <span style={{ color: colors.accent }}>suddenly spin three times faster</span>. How do they accelerate without pushing off anything?"
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
            "Angular momentum must be conserved. When a skater pulls her arms in, reducing her moment of inertia, her angular velocity must increase proportionally. It's pure physics, beautifully demonstrated."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — Classical Mechanics
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover the Physics
        </button>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Arms push air outward, and the reaction force speeds up the spin' },
      { id: 'b', text: 'Angular momentum is conserved - smaller radius needs faster speed', correct: true },
      { id: 'c', text: 'Muscles add rotational energy when pulling arms against centrifugal force' },
      { id: 'd', text: 'Gravity affects the body less when arms are closer to center of mass' },
    ];

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: '16px',
        }}>
        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
            WHY does pulling arms in make a skater spin faster?
          </h2>

          {/* Static SVG visualization for predict phase */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width={isMobile ? 320 : 400} height={200} viewBox="0 0 400 200" style={{ margin: '0 auto' }}>
              <defs>
                <radialGradient id="predictBodyGrad" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#334155" />
                </radialGradient>
                <radialGradient id="predictWeightGrad" cx="30%" cy="25%" r="65%">
                  <stop offset="0%" stopColor="#f9a8d4" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#9d174d" />
                </radialGradient>
              </defs>

              {/* Extended arms figure - slow */}
              <g transform="translate(100, 100)">
                <ellipse cx="0" cy="10" rx="18" ry="28" fill="url(#predictBodyGrad)" />
                <circle cx="0" cy="-22" r="15" fill="#94a3b8" />
                <line x1="-16" y1="0" x2="-60" y2="0" stroke="#64748b" strokeWidth="7" strokeLinecap="round" />
                <line x1="16" y1="0" x2="60" y2="0" stroke="#64748b" strokeWidth="7" strokeLinecap="round" />
                <circle cx="-60" cy="0" r="10" fill="url(#predictWeightGrad)" />
                <circle cx="60" cy="0" r="10" fill="url(#predictWeightGrad)" />
                <text x="0" y="65" textAnchor="middle" fill={colors.warning} fontSize="12">Slow Spin</text>
                <text x="0" y="80" textAnchor="middle" fill={colors.textMuted} fontSize="11">High Moment of Inertia</text>
              </g>

              {/* Arrow */}
              <text x="200" y="100" textAnchor="middle" fill={colors.accent} fontSize="24">→</text>

              {/* Tucked arms figure - fast */}
              <g transform="translate(300, 100)">
                <ellipse cx="0" cy="10" rx="18" ry="28" fill="url(#predictBodyGrad)" />
                <circle cx="0" cy="-22" r="15" fill="#94a3b8" />
                <line x1="-16" y1="0" x2="-25" y2="0" stroke="#64748b" strokeWidth="7" strokeLinecap="round" />
                <line x1="16" y1="0" x2="25" y2="0" stroke="#64748b" strokeWidth="7" strokeLinecap="round" />
                <circle cx="-25" cy="0" r="10" fill="url(#predictWeightGrad)" />
                <circle cx="25" cy="0" r="10" fill="url(#predictWeightGrad)" />
                {/* Rotation indicator */}
                <ellipse cx="0" cy="0" rx="40" ry="10" fill="none" stroke={colors.accent} strokeWidth="2" strokeDasharray="4 4" opacity="0.5" />
                <text x="0" y="65" textAnchor="middle" fill={colors.success} fontSize="12">Fast Spin!</text>
                <text x="0" y="80" textAnchor="middle" fill={colors.textMuted} fontSize="11">Low Moment of Inertia</text>
              </g>

              {/* Legend */}
              <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="bold">Angular Momentum Conservation</text>
            </svg>
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
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Spinning Chair Simulation
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '16px',
        }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Spinning Chair Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '12px' }}>
            This visualization shows how angular momentum conservation works in practice. Observe how the figure spins faster or slower as you adjust the controls.
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
            When you increase arm extension, the moment of inertia increases, which causes the rotation to slow down. This principle is useful in practical applications from figure skating to spacecraft attitude control.
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {/* Main visualization */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  {renderSpinningFigure()}
                </div>

                {renderStatsDisplay()}
                {renderAngularMomentumDisplay()}
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Controls */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
              }}>
                {/* Arm position slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Arm Distance (radius)</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                      {armExtension.toFixed(2)} — {armExtension < 0.3 ? 'Tucked' : armExtension > 0.7 ? 'Extended' : 'Mid'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={armExtension}
                    onChange={(e) => setArmExtension(parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      touchAction: 'pan-y',
                      height: '20px',
                      borderRadius: '4px',
                      accentColor: colors.accent,
                      cursor: 'pointer',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>Tucked (Fast)</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>Extended (Slow)</span>
                  </div>
                </div>

                {/* Weight toggle */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '20px',
                }}>
                  <button
                    onClick={() => setHasWeights(true)}
                    style={{
                      background: hasWeights ? `${colors.pink}22` : colors.bgSecondary,
                      border: `2px solid ${hasWeights ? colors.pink : colors.border}`,
                      borderRadius: '10px',
                      padding: '14px',
                      cursor: 'pointer',
                      color: colors.textPrimary,
                      fontWeight: 600,
                    }}
                  >
                    With Weights
                  </button>
                  <button
                    onClick={() => setHasWeights(false)}
                    style={{
                      background: !hasWeights ? `${colors.accent}22` : colors.bgSecondary,
                      border: `2px solid ${!hasWeights ? colors.accent : colors.border}`,
                      borderRadius: '10px',
                      padding: '14px',
                      cursor: 'pointer',
                      color: colors.textPrimary,
                      fontWeight: 600,
                    }}
                  >
                    Arms Only
                  </button>
                </div>

                {/* Spin button */}
                <button
                  onClick={() => setIsSpinning(!isSpinning)}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: isSpinning ? colors.error : colors.success,
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isSpinning ? 'Stop Spinning' : 'Start Spinning'}
                </button>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {speedRatio > 1.5 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Notice how pulling arms in increases speed while L stays constant!
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
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: '16px',
        }}>
        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Conservation of Angular Momentum
          </h2>

          <div style={{
            background: `${colors.success}11`,
            border: `1px solid ${colors.success}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
              As you observed in the experiment, pulling arms inward causes faster spinning. Your prediction about angular momentum conservation was tested - this is exactly what the physics predicts!
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
                <strong style={{ color: colors.textPrimary }}>The Fundamental Law: L = I x omega = constant</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                <span style={{ color: colors.accent, fontWeight: 600 }}>Angular Momentum (L)</span> is like a "spinning memory" - it must be preserved when no external torque acts on the system.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <span style={{ color: colors.warning, fontWeight: 600 }}>Moment of Inertia (I)</span> measures resistance to rotation change. It depends on mass AND how far that mass is from the rotation axis: I = Sum of m*r squared.
              </p>
              <p>
                <span style={{ color: colors.success, fontWeight: 600 }}>Angular Velocity (omega)</span> is how fast you're spinning. When I decreases (arms in), omega must increase to keep L constant!
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Key Insight: The r-squared Effect
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Because I includes r-squared, doubling the distance of mass from the axis QUADRUPLES the moment of inertia. This is why arm position has such a dramatic effect on spin speed.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
                The Math in Action
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                If a skater reduces her moment of inertia from 4.8 kg*m2 to 1.6 kg*m2 (3x reduction), her angular velocity must TRIPLE. Starting at 2 rev/s, she reaches 6 rev/s!
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore the Mass Effect
          </button>
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Same speed increase - arms have mass too, so the physics is identical' },
      { id: 'b', text: 'SMALLER speed increase - less mass moving means smaller change in I', correct: true },
      { id: 'c', text: 'LARGER speed increase - weights were slowing the spin down' },
      { id: 'd', text: 'No change at all - weights dont matter for angular momentum' },
    ];

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: '16px',
        }}>
        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Mass Distribution
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            You saw heavy weights make a big difference. What if you spin with NO weights (just your arms)?
          </h2>

          <p style={{ ...typo.body, color: colors.accent, marginBottom: '24px' }}>
            Will the speed increase when pulling arms in be bigger, smaller, or the same?
          </p>

          {/* Static SVG for twist predict */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width={isMobile ? 320 : 400} height={160} viewBox="0 0 400 160" style={{ margin: '0 auto' }}>
              <defs>
                <radialGradient id="twistBodyGrad" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#334155" />
                </radialGradient>
                <radialGradient id="twistWeightGrad" cx="30%" cy="25%" r="65%">
                  <stop offset="0%" stopColor="#f9a8d4" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#9d174d" />
                </radialGradient>
              </defs>

              {/* With heavy weights */}
              <g transform="translate(100, 80)">
                <ellipse cx="0" cy="8" rx="15" ry="24" fill="url(#twistBodyGrad)" />
                <circle cx="0" cy="-18" r="12" fill="#94a3b8" />
                <line x1="-14" y1="0" x2="-45" y2="0" stroke="#64748b" strokeWidth="6" strokeLinecap="round" />
                <line x1="14" y1="0" x2="45" y2="0" stroke="#64748b" strokeWidth="6" strokeLinecap="round" />
                <circle cx="-45" cy="0" r="12" fill="url(#twistWeightGrad)" />
                <circle cx="45" cy="0" r="12" fill="url(#twistWeightGrad)" />
                <text x="0" y="55" textAnchor="middle" fill={colors.pink} fontSize="11" fontWeight="bold">Heavy Weights</text>
                <text x="0" y="70" textAnchor="middle" fill={colors.textMuted} fontSize="11">Large mass at radius</text>
              </g>

              {/* vs text */}
              <text x="200" y="85" textAnchor="middle" fill={colors.textSecondary} fontSize="16" fontWeight="bold">VS</text>

              {/* Arms only */}
              <g transform="translate(300, 80)">
                <ellipse cx="0" cy="8" rx="15" ry="24" fill="url(#twistBodyGrad)" />
                <circle cx="0" cy="-18" r="12" fill="#94a3b8" />
                <line x1="-14" y1="0" x2="-40" y2="0" stroke="#64748b" strokeWidth="6" strokeLinecap="round" />
                <line x1="14" y1="0" x2="40" y2="0" stroke="#64748b" strokeWidth="6" strokeLinecap="round" />
                <circle cx="-40" cy="0" r="5" fill="#64748b" />
                <circle cx="40" cy="0" r="5" fill="#64748b" />
                <text x="0" y="55" textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="bold">Arms Only</text>
                <text x="0" y="70" textAnchor="middle" fill={colors.textMuted} fontSize="11">Small mass at radius</text>
              </g>

              <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="bold">Mass Distribution Comparison</text>
            </svg>
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
              Compare Both Scenarios
            </button>
          )}
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: '16px',
        }}>
        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Compare With/Without Weights
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Toggle between heavy weights and arms only - watch the difference in speed gain
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  {renderSpinningFigure()}
                </div>
                {renderStatsDisplay()}
                {renderAngularMomentumDisplay()}
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
              }}>
                {/* Weight toggle at top */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '20px',
                }}>
                  <button
                    onClick={() => setHasWeights(true)}
                    style={{
                      background: hasWeights ? `${colors.pink}22` : colors.bgSecondary,
                      border: `2px solid ${hasWeights ? colors.pink : colors.border}`,
                      borderRadius: '10px',
                      padding: '14px',
                      cursor: 'pointer',
                      color: colors.textPrimary,
                      fontWeight: 600,
                    }}
                  >
                    Heavy Weights (2 kg each)
                  </button>
                  <button
                    onClick={() => setHasWeights(false)}
                    style={{
                      background: !hasWeights ? `${colors.accent}22` : colors.bgSecondary,
                      border: `2px solid ${!hasWeights ? colors.accent : colors.border}`,
                      borderRadius: '10px',
                      padding: '14px',
                      cursor: 'pointer',
                      color: colors.textPrimary,
                      fontWeight: 600,
                    }}
                  >
                    Arms Only (0.2 kg each)
                  </button>
                </div>

                {/* Arm slider */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Arm Distance (radius)</span>
                    <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>
                      {armExtension.toFixed(2)} — {armExtension < 0.3 ? 'Tucked' : armExtension > 0.7 ? 'Extended' : 'Mid'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={armExtension}
                    onChange={(e) => setArmExtension(parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      touchAction: 'pan-y',
                      height: '20px',
                      borderRadius: '4px',
                      accentColor: colors.accent,
                      cursor: 'pointer',
                    }}
                  />
                </div>

                {/* Spin button */}
                <button
                  onClick={() => setIsSpinning(!isSpinning)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    marginTop: '16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isSpinning ? colors.error : colors.success,
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isSpinning ? 'Stop' : 'Spin'}
                </button>
              </div>
            </div>
          </div>

          {/* Comparison insight */}
          <div style={{
            background: `${colors.warning}22`,
            border: `1px solid ${colors.warning}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
              {hasWeights
                ? 'With heavy weights: Large change in I when moving arms = Large change in omega'
                : 'Arms only: Small change in I when moving arms = Small change in omega'}
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Why
          </button>
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: '16px',
        }}>
        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Mass Distribution is Key!
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>I = Sum of m * r squared</span>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                The mass (m) directly multiplies the effect of position change (r). More mass at the ends = bigger change in I when you move it.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
            }}>
              <div style={{
                background: `${colors.pink}11`,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.pink}33`,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏋️</div>
                <h3 style={{ ...typo.h3, color: colors.pink, marginBottom: '8px' }}>Heavy Weights</h3>
                <p style={{ ...typo.small, color: colors.textSecondary }}>Large Delta-I</p>
                <p style={{ ...typo.small, color: colors.textSecondary }}>= Large Delta-omega</p>
                <p style={{ ...typo.body, color: colors.success, marginTop: '8px', fontWeight: 600 }}>Spin 3x faster!</p>
              </div>
              <div style={{
                background: `${colors.accent}11`,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.accent}33`,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>🙌</div>
                <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>Arms Only</h3>
                <p style={{ ...typo.small, color: colors.textSecondary }}>Small Delta-I</p>
                <p style={{ ...typo.small, color: colors.textSecondary }}>= Small Delta-omega</p>
                <p style={{ ...typo.body, color: colors.warning, marginTop: '8px', fontWeight: 600 }}>Spin 1.2x faster</p>
              </div>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
                This is why figure skaters matter
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Elite skaters have lean, distributed limbs. The mass of arms and legs, positioned far from the rotation axis, creates large moment of inertia changes. Combined with technique and strength, this enables the spectacular spins we see in competition.
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
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Angular Momentum"
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

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: '16px',
        }}>
        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length} - Explore all to continue
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
                    ✓
                  </div>
                )}
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                  {a.title.split(' ').slice(0, 2).join(' ')}
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
                How Angular Momentum Applies:
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

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>Examples:</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {app.examples.map((ex, i) => (
                  <span key={i} style={{
                    background: colors.bgSecondary,
                    padding: '6px 12px',
                    borderRadius: '16px',
                    ...typo.small,
                    color: colors.textSecondary,
                  }}>
                    {ex}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>Key Organizations:</h4>
              <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                {app.companies.join(' | ')}
              </p>
            </div>

            {/* Got It button for current app */}
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                // Auto-advance to next incomplete app
                const nextIncomplete = newCompleted.findIndex((c, i) => !c && i > selectedApp);
                if (nextIncomplete !== -1) {
                  setSelectedApp(nextIncomplete);
                } else {
                  const firstIncomplete = newCompleted.findIndex(c => !c);
                  if (firstIncomplete !== -1) {
                    setSelectedApp(firstIncomplete);
                  }
                }
              }}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: completedApps[selectedApp] ? colors.success : colors.accent,
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '48px',
              }}
            >
              {completedApps[selectedApp] ? 'Completed' : 'Got It - Next Application'}
            </button>
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          )}
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: colors.bgPrimary,
        }}>
          {renderProgressBar()}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            paddingBottom: '16px',
          }}>
          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
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
                ? 'You have mastered angular momentum conservation!'
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
          </div>
          {renderBottomNav()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: '16px',
        }}>
        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
                Previous
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
                Next
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
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          paddingBottom: '16px',
          textAlign: 'center',
        }}>

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          ⛸️
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Angular Momentum Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand why figure skaters spin faster when they pull their arms in, and how this principle applies throughout the universe.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Mastered:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'L = I times omega = constant (no external torque)',
              'Moment of inertia I = sum of m times r-squared',
              'Smaller I means larger omega to conserve L',
              'Mass distribution dramatically affects I',
              'Applications from skating to neutron stars',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🔄</div>
            <div style={{ ...typo.small, color: colors.textSecondary }}>L = Iw</div>
          </div>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>⚖️</div>
            <div style={{ ...typo.small, color: colors.textSecondary }}>I = Sum mr2</div>
          </div>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>⛸️</div>
            <div style={{ ...typo.small, color: colors.textSecondary }}>Skating</div>
          </div>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🌟</div>
            <div style={{ ...typo.small, color: colors.textSecondary }}>Pulsars</div>
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
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  return null;
};

export default AngularMomentumRenderer;
