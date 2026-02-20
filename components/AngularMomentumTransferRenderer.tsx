'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Angular Momentum Transfer - Complete 10-Phase Learning Game
// How cats (and astronauts) rotate in mid-air with zero external torque
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

interface AngularMomentumTransferRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete' | 'meow') => {
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
      failure: { freq: 300, duration: 0.3, type: 'sawtooth' },
      transition: { freq: 500, duration: 0.15, type: 'triangle' },
      complete: { freq: 900, duration: 0.4, type: 'sine' },
      meow: { freq: 700, duration: 0.2, type: 'sine' }
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
    scenario: "A cat falls from a tree branch, starting with zero rotation. Within 0.3 seconds, it has rotated 180 degrees to land on its feet.",
    question: "How does the cat achieve this rotation without any external torque?",
    options: [
      { id: 'a', label: "It pushes against the air molecules like swimming" },
      { id: 'b', label: "Gravity pulls one side down faster than the other" },
      { id: 'c', label: "It transfers angular momentum between body parts by extending and tucking limbs asymmetrically", correct: true },
      { id: 'd', label: "Cats have a special organ that defies physics" }
    ],
    explanation: "By extending legs on one side (high moment of inertia, slow rotation) while tucking legs on the other (low moment of inertia, fast rotation), cats transfer angular momentum between body parts. The total angular momentum stays zero, but net rotation accumulates through this asymmetric configuration cycling."
  },
  {
    scenario: "A figure skater starts spinning slowly with arms extended. She pulls her arms tight to her chest, and suddenly spins much faster.",
    question: "What physics principle explains this speed increase?",
    options: [
      { id: 'a', label: "She pushes harder against the ice with her skate" },
      { id: 'b', label: "Conservation of angular momentum - lower moment of inertia means higher angular velocity", correct: true },
      { id: 'c', label: "The audience cheering provides extra energy" },
      { id: 'd', label: "Her costume creates less air resistance" }
    ],
    explanation: "Angular momentum L = I x omega must stay constant. When the skater reduces her moment of inertia (I) by pulling arms in, her angular velocity (omega) must increase proportionally. Halving I doubles omega - this is why she spins faster!"
  },
  {
    scenario: "An astronaut floats in the middle of a space station, not touching anything. She needs to rotate 90 degrees to face a control panel.",
    question: "Can she rotate without pushing off anything?",
    options: [
      { id: 'a', label: "No - rotation is impossible without external torque" },
      { id: 'b', label: "Yes - by using asymmetric arm and leg movements like a cat", correct: true },
      { id: 'c', label: "Only if she throws an object in the opposite direction" },
      { id: 'd', label: "Only with special astronaut equipment" }
    ],
    explanation: "Just like cats, astronauts can rotate by cycling through body configurations. By extending one arm while keeping the other tucked, then switching, they can accumulate net rotation. It's slower than a cat, but the physics is identical."
  },
  {
    scenario: "A spinning bicycle wheel is held vertically. When the rider tilts it to one side, the bicycle unexpectedly starts turning in a different direction.",
    question: "What causes this unexpected turning behavior?",
    options: [
      { id: 'a', label: "The tires have asymmetric grip patterns" },
      { id: 'b', label: "Gyroscopic precession - the wheel resists tilt and creates perpendicular rotation", correct: true },
      { id: 'c', label: "Air resistance on the spinning spokes" },
      { id: 'd', label: "The rider's weight shifts automatically" }
    ],
    explanation: "A spinning object has angular momentum that resists changes. When you try to tilt it, it responds by rotating perpendicular to both the spin axis and the applied torque. This gyroscopic precession is why bicycles are stable and why the wheel turns unexpectedly."
  },
  {
    scenario: "Engineers are designing a robot that can fall from any height and land upright. They study videos of cats at 1000 frames per second.",
    question: "What key feature must the robot have to mimic cat righting?",
    options: [
      { id: 'a', label: "Powerful jet thrusters for mid-air propulsion" },
      { id: 'b', label: "A flexible spine that allows the front and back halves to rotate semi-independently", correct: true },
      { id: 'c', label: "Extremely light weight to float down slowly" },
      { id: 'd', label: "Large flat surfaces to generate air lift" }
    ],
    explanation: "The cat's secret is its extremely flexible spine that allows the front and back halves to rotate almost independently. This lets it sequentially rotate each half while the other counter-rotates minimally. A rigid robot cannot perform this maneuver - flexibility is essential."
  },
  {
    scenario: "A diver pushes off the platform with no initial twist. In mid-air, she wants to add twisting rotations to her somersault.",
    question: "How can she initiate twists after leaving the platform?",
    options: [
      { id: 'a', label: "It's impossible - all rotation must come from the takeoff" },
      { id: 'b', label: "By tilting her body axis and asymmetrically moving her arms", correct: true },
      { id: 'c', label: "By spreading her body wide to catch more air" },
      { id: 'd', label: "By screaming loudly to create thrust" }
    ],
    explanation: "Divers use the 'cat twist' technique - by dropping one shoulder and moving arms asymmetrically, they can transfer angular momentum from somersault to twist rotation. Elite divers can add 3-4 twists to a dive using pure body mechanics, no air pushing required."
  },
  {
    scenario: "A satellite in orbit needs to point its camera at a specific star. It has no propellant left for attitude thrusters.",
    question: "How can it still change its orientation?",
    options: [
      { id: 'a', label: "It cannot - satellites need propellant to rotate" },
      { id: 'b', label: "Using reaction wheels that spin up to rotate the spacecraft body in the opposite direction", correct: true },
      { id: 'c', label: "By bouncing signals off other satellites" },
      { id: 'd', label: "Solar wind will naturally push it to the correct orientation" }
    ],
    explanation: "Reaction wheels are spinning flywheels inside the satellite. When a wheel speeds up, the satellite body rotates the opposite way to conserve angular momentum. By controlling three orthogonal wheels, a satellite can point precisely in any direction without using any propellant."
  },
  {
    scenario: "The Hubble Space Telescope can point at targets with 0.007 arcsecond accuracy - precise enough to hit a dime from 200 miles away.",
    question: "What provides this extreme pointing precision?",
    options: [
      { id: 'a', label: "Powerful rocket thrusters that fire in tiny pulses" },
      { id: 'b', label: "Six reaction wheels providing smooth angular momentum exchange without vibration", correct: true },
      { id: 'c', label: "Magnetic fields that lock onto Earth's magnetic poles" },
      { id: 'd', label: "Gravitational attraction from distant stars" }
    ],
    explanation: "Hubble uses six reaction wheels (four active, two backup) to make microscopic pointing adjustments. The wheels provide smooth, continuous control without the vibrations that thrusters would cause. This frictionless angular momentum exchange enables photography of extremely distant galaxies."
  },
  {
    scenario: "A physics student says 'Angular momentum is always conserved, so a falling cat should hit the ground in the same orientation it started.'",
    question: "What is the flaw in this reasoning?",
    options: [
      { id: 'a', label: "Angular momentum isn't actually conserved" },
      { id: 'b', label: "The cat is not a rigid body - it can change shape and redistribute angular momentum between parts", correct: true },
      { id: 'c', label: "Gravity provides the external torque needed for rotation" },
      { id: 'd', label: "Air resistance creates the rotation" }
    ],
    explanation: "The student treats the cat as a rigid body, but it's not. A deformable body can change its moment of inertia distribution. While TOTAL angular momentum stays zero, the cat transfers angular momentum between its front and back halves through shape changes, accumulating net rotation."
  },
  {
    scenario: "Research shows cats need a minimum of about 30 cm (1 foot) of falling distance to complete the righting reflex.",
    question: "Why is there a minimum height requirement?",
    options: [
      { id: 'a', label: "Cats need to see the ground to know which way to rotate" },
      { id: 'b', label: "The righting sequence takes about 0.3 seconds, requiring minimum fall time", correct: true },
      { id: 'c', label: "Air resistance needs distance to build up" },
      { id: 'd', label: "Cats must reach terminal velocity first" }
    ],
    explanation: "The cat righting reflex involves a precise sequence of body shape changes that takes about 0.3 seconds to complete. A 30 cm fall provides just enough time (under Earth's gravity) for the full sequence. Shorter falls don't give the cat enough time to finish rotating."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🛰️',
    title: 'Reaction Wheels in Spacecraft',
    short: 'Satellite attitude control',
    tagline: 'Pointing at stars with zero propellant',
    description: 'Reaction wheels are spinning flywheels that control spacecraft orientation without using fuel. By speeding up or slowing down internal wheels, satellites can rotate with extreme precision to point cameras, antennas, and solar panels exactly where needed.',
    connection: 'When a reaction wheel spins faster, the spacecraft body rotates in the opposite direction to conserve total angular momentum. This is the exact same principle as the cat extending one set of legs while tucking the other - internal angular momentum transfer without external torque.',
    howItWorks: 'A typical spacecraft has 3-4 reaction wheels oriented along different axes. Electric motors accelerate or decelerate each wheel, causing equal and opposite rotation of the spacecraft body. The Hubble Space Telescope uses six reaction wheels to achieve pointing accuracy of 0.007 arcseconds - precise enough to hold a laser on a dime from 200 miles away.',
    stats: [
      { value: '0.007"', label: 'Arcsecond accuracy', icon: '🎯' },
      { value: '6,000', label: 'Max RPM', icon: '⚡' },
      { value: '15+ yrs', label: 'Typical lifespan', icon: '🔋' }
    ],
    examples: [
      'Hubble Space Telescope imaging distant galaxies with sub-pixel stability',
      'GPS satellites maintaining precise Earth-pointing for navigation signals',
      'James Webb Space Telescope holding position for multi-hour exposures',
      'Kepler spacecraft tracking exoplanet transits across stars'
    ],
    companies: ['NASA', 'SpaceX', 'Lockheed Martin', 'Northrop Grumman', 'Honeywell Aerospace'],
    futureImpact: 'Next-generation control moment gyroscopes (CMGs) combine wheel spinning with gimbal rotation for even faster, more precise attitude control. Magnetic bearings eliminate friction for 25+ year mission lifetimes.',
    color: '#3B82F6'
  },
  {
    icon: '🤸',
    title: 'Olympic Diving & Gymnastics',
    short: 'Adding twists in mid-air',
    tagline: 'World-class athletes as angular momentum masters',
    description: 'Elite divers and gymnasts can initiate twisting rotations AFTER leaving the platform or apparatus, even when they pushed off with zero twist. This "cat twist" technique allows them to add complex multi-twist maneuvers dramatically increasing difficulty scores.',
    connection: 'Just like cats, divers use asymmetric limb movements to transfer angular momentum. By dropping one shoulder and moving arms asymmetrically, they can convert somersault momentum into twist rotation while conserving total angular momentum.',
    howItWorks: 'A diver initiates twist by tilting their body axis (dropping one shoulder) while somersaulting. Asymmetric arm positions - one wrapped tight, one extended - create different moments of inertia. The body naturally rotates toward the side with lower moment of inertia. Top divers can add 3-4 twists to a 3.5 somersault dive this way.',
    stats: [
      { value: '4.5', label: 'Max twists added', icon: '🌀' },
      { value: '1.8s', label: 'Flight time (10m)', icon: '⏱️' },
      { value: '55 km/h', label: 'Entry speed', icon: '💨' }
    ],
    examples: [
      'Olympic platform diving 10m events with 5-twist somersaults',
      'Springboard diving with mid-air twist initiation',
      'Gymnastics floor exercise with multiple twisting flips',
      'Freestyle skiing aerials combining flips and twists'
    ],
    companies: ['USA Diving', 'FINA World Aquatics', 'USA Gymnastics', 'Red Bull Cliff Diving'],
    futureImpact: 'Motion capture and AI analysis are helping athletes optimize their twist initiation timing. New dive combinations previously thought impossible are being developed using precise angular momentum calculations.',
    color: '#8B5CF6'
  },
  {
    icon: '🤖',
    title: 'Self-Righting Robots',
    short: 'Robots that land on their feet',
    tagline: 'Boston Dynamics inspired by 100-million-year-old reflex',
    description: 'Researchers at MIT, Boston Dynamics, and ETH Zurich study cat biomechanics to create robots that can recover from falls. Understanding angular momentum transfer enables robots to self-right in mid-air without wings, parachutes, or thrusters.',
    connection: 'A falling robot, like a falling cat, starts with zero angular momentum. By rapidly moving limbs asymmetrically, the robot can rotate its body while keeping total angular momentum at zero - pure internal angular momentum transfer.',
    howItWorks: 'Cat-inspired robots use rapid limb movements and internal reaction wheels to reorient during falls. High-speed servos move limbs through calculated trajectories that maximize rotation per unit time. Some designs combine passive mechanical systems with active control for faster response.',
    stats: [
      { value: '< 200ms', label: 'Reflex time', icon: '⚡' },
      { value: '180°', label: 'Max rotation', icon: '🔄' },
      { value: '50 cm', label: 'Min fall height', icon: '📏' }
    ],
    examples: [
      'Boston Dynamics Spot and Atlas recovering from pushes and trips',
      'MIT Cheetah robot landing on feet after jumps',
      'ETH Zurich ANYmal adapting to unexpected terrain',
      'NASA JPL rovers with self-righting capability for Mars exploration'
    ],
    companies: ['Boston Dynamics', 'MIT Biomimetics Lab', 'ETH Zurich', 'Agility Robotics', 'NASA JPL'],
    futureImpact: 'Delivery drones and urban air mobility vehicles will use cat-inspired self-righting to recover from mid-flight collisions. Wearable airbag systems for elderly fall protection use similar rapid-deployment physics.',
    color: '#10B981'
  },
  {
    icon: '🚀',
    title: 'Astronaut Self-Rotation',
    short: 'Moving in microgravity',
    tagline: 'NASA trains astronauts in cat physics',
    description: 'Astronauts floating in spacecraft can rotate to face different directions using only their body movements - no handholds or equipment needed. NASA trains astronauts in these maneuvers using underwater neutral buoyancy facilities.',
    connection: 'Astronauts use the identical physics as cats - asymmetric limb movements that transfer angular momentum between body parts. The technique is slower for humans (we are less flexible than cats) but the conservation laws are exactly the same.',
    howItWorks: 'Common techniques include asymmetric arm circles (extend one arm, circle it while the other is tucked), bicycle legs (pedal in asymmetric patterns), and hula-hip rotations. Combining multiple techniques allows rotation around any axis. The key is always asymmetry - different moments of inertia between body parts.',
    stats: [
      { value: '2-3s', label: 'Per 90° rotation', icon: '⏱️' },
      { value: '6 mo', label: 'Training period', icon: '📚' },
      { value: '3 axes', label: 'Full control', icon: '🎯' }
    ],
    examples: [
      'ISS astronauts reorienting for photography and experiments',
      'Spacewalk (EVA) self-rotation when away from handholds',
      'Emergency reorientation if separated from spacecraft',
      'Underwater training at NASA Neutral Buoyancy Laboratory'
    ],
    companies: ['NASA', 'ESA', 'JAXA', 'SpaceX Crew Dragon', 'Boeing Starliner'],
    futureImpact: 'Long-duration Moon and Mars missions will require astronauts to master self-rotation for working in low-gravity environments. VR training systems now teach these maneuvers before astronauts ever leave Earth.',
    color: '#F59E0B'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const AngularMomentumTransferRenderer: React.FC<AngularMomentumTransferRendererProps> = ({
  onGameEvent,
  gamePhase,
  onPhaseComplete
}) => {
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
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Cat animation state
  const [fallProgress, setFallProgress] = useState(0);
  const [catRotation, setCatRotation] = useState(180);
  const [frontLegsExtended, setFrontLegsExtended] = useState(false);
  const [backLegsExtended, setBackLegsExtended] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPhaseLabels, setShowPhaseLabels] = useState(true);

  // Play phase controls
  const [manualFrontExtended, setManualFrontExtended] = useState(false);
  const [manualBackExtended, setManualBackExtended] = useState(true);
  const [manualRotation, setManualRotation] = useState(180);

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

  // Cat righting animation
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setFallProgress(prev => {
        const newProgress = prev + 2;

        if (newProgress < 30) {
          setFrontLegsExtended(false);
          setBackLegsExtended(true);
          setCatRotation(180 - (newProgress / 30) * 90);
        } else if (newProgress < 60) {
          setFrontLegsExtended(true);
          setBackLegsExtended(false);
          setCatRotation(90 - ((newProgress - 30) / 30) * 90);
        } else if (newProgress < 100) {
          setFrontLegsExtended(true);
          setBackLegsExtended(true);
          setCatRotation(Math.max(0, 0 - ((newProgress - 60) / 40) * 5));
        } else {
          setIsAnimating(false);
          playSound('meow');
          return 0;
        }

        return newProgress;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316',
    accentLight: '#FB923C',
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    purple: '#8B5CF6',
    textPrimary: '#FFFFFF',
    textSecondary: '#B5BCC5',
    textMuted: '#B8C0CA',
    border: '#2a2a3a',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
    label: { fontSize: isMobile ? '11px' : '12px', fontWeight: 500 },
  };

  // Phase navigation
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Review',
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
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'angular-momentum-transfer',
        gameTitle: 'Angular Momentum Transfer',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    if (onPhaseComplete) {
      onPhaseComplete(p);
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent, onPhaseComplete]);

  const nextPhase = useCallback(() => {
    const currentIndex = validPhases.indexOf(phase);
    if (currentIndex < validPhases.length - 1) {
      goToPhase(validPhases[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const startAnimation = useCallback(() => {
    setFallProgress(0);
    setCatRotation(180);
    setFrontLegsExtended(false);
    setBackLegsExtended(true);
    setIsAnimating(true);
    playSound('click');
  }, []);

  // Progress bar component
  const renderProgressBar = () => {
    const currentIndex = validPhases.indexOf(phase);
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${colors.border}`,
        padding: isMobile ? '12px 16px' : '14px 24px',
      }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: typo.small.fontSize,
            fontWeight: 600,
            color: colors.accent
          }}>
            Angular Momentum
          </span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {validPhases.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                title={phaseLabels[p]}
                style={{
                  height: '8px',
                  width: phase === p ? '24px' : '8px',
                  borderRadius: '4px',
                  backgroundColor: phase === p ? colors.accent : i < currentIndex ? colors.success : colors.border,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
          <span style={{
            fontSize: typo.small.fontSize,
            color: colors.textSecondary,
            fontWeight: 500,
          }}>
            {phaseLabels[phase]}
          </span>
        </div>
      </div>
    );
  };

  // Navigation dots component
  const renderNavDots = () => {
    const currentIndex = validPhases.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        marginTop: '24px',
      }}>
        {validPhases.map((p, i) => (
          <button
            key={p}
            onClick={() => goToPhase(p)}
            aria-label={phaseLabels[p]}
            title={phaseLabels[p]}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: phase === p ? colors.accent : i < currentIndex ? colors.success : colors.border,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: phase === p ? 'scale(1.2)' : 'scale(1)',
            }}
          />
        ))}
      </div>
    );
  };

  // Bottom navigation bar
  const phaseNames: Record<string, string> = phaseLabels;
  const renderBottomBar = () => {
    const currentIndex = validPhases.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === validPhases.length - 1;
    const isTestPhase = phase === 'test';
    const quizComplete = isTestPhase && testSubmitted;
    const canGoNext = !isLast && (!isTestPhase || quizComplete);
    return (
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
        <button onClick={() => !isFirst && goToPhase(validPhases[currentIndex - 1])} style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: isFirst ? 'rgba(255,255,255,0.3)' : 'white', cursor: isFirst ? 'not-allowed' : 'pointer', opacity: isFirst ? 0.4 : 1 }}>
          Back
        </button>
        <div style={{ display: 'flex', gap: '6px' }}>
          {validPhases.map((p, i) => (
            <div key={p} onClick={() => i <= currentIndex && goToPhase(p)} title={phaseNames[p] || p} style={{ width: p === phase ? '20px' : '10px', height: '10px', borderRadius: '5px', background: p === phase ? '#3b82f6' : i < currentIndex ? '#10b981' : 'rgba(255,255,255,0.2)', cursor: i <= currentIndex ? 'pointer' : 'default', transition: 'all 0.3s ease' }} />
          ))}
        </div>
        <button onClick={() => canGoNext && goToPhase(validPhases[currentIndex + 1])} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: canGoNext ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)', color: 'white', cursor: canGoNext ? 'pointer' : 'not-allowed', opacity: canGoNext ? 1 : 0.4 }}>
          Next
        </button>
      </div>
    );
  };

  // Cat SVG component
  const renderCat = (rotation: number, frontExt: boolean, backExt: boolean, size: number = 200, showLabels: boolean = false) => {
    const vbW = Math.max(size, 300);
    const vbH = Math.max(size, 200);
    const centerX = vbW / 2;
    const centerY = vbH / 2;

    return (
      <svg width={size} height={size} viewBox={`0 0 ${vbW} ${vbH}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0369a1" />
            <stop offset="50%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
          <linearGradient id="catBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <radialGradient id="catHeadGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fdba74" />
            <stop offset="50%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#f97316" />
          </radialGradient>
          <linearGradient id="groundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          <filter id="catGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g>
        <rect x="0" y="0" width={vbW} height={vbH} fill="url(#skyGrad)" rx="10" />

        {showLabels && (
          <>
            <circle
              cx={centerX - 30}
              cy={centerY}
              r={frontExt ? 40 : 22}
              fill={frontExt ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.3)'}
              style={{ transition: 'r 0.3s ease' }}
            />
            <circle
              cx={centerX + 30}
              cy={centerY}
              r={backExt ? 40 : 22}
              fill={backExt ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.3)'}
              style={{ transition: 'r 0.3s ease' }}
            />
          </>
        )}

        <g transform={`translate(${centerX}, ${centerY}) rotate(${rotation})`}>
          <ellipse cx="20" cy="0" rx="28" ry="18" fill="url(#catBodyGrad)" />

          {backExt ? (
            <>
              <rect x="30" y="-22" width="7" height="26" rx="3" fill="#f97316" transform="rotate(-30, 30, -10)" />
              <rect x="30" y="-4" width="7" height="26" rx="3" fill="#f97316" transform="rotate(30, 30, 10)" />
            </>
          ) : (
            <>
              <rect x="35" y="-10" width="5" height="13" rx="2" fill="#f97316" transform="rotate(-15, 35, -5)" />
              <rect x="35" y="-2" width="5" height="13" rx="2" fill="#f97316" transform="rotate(15, 35, 5)" />
            </>
          )}

          <path d="M42 0Q55-8 62 4Q70 16 62 20" fill="none" stroke="#ea580c" strokeWidth="5" strokeLinecap="round" />

          <ellipse cx="-18" cy="0" rx="22" ry="16" fill="url(#catBodyGrad)" />
          <circle cx="-40" cy="0" r="16" fill="url(#catHeadGrad)" />

          <polygon points="-50,-12 -52,-26 -44,-15" fill="#f97316" />
          <polygon points="-30,-12 -28,-26 -36,-15" fill="#f97316" />
          <polygon points="-49,-14 -51,-23 -45,-16" fill="#fda4af" opacity="0.5" />
          <polygon points="-31,-14 -29,-23 -35,-16" fill="#fda4af" opacity="0.5" />

          <circle cx="-45" cy="-2" r="3" fill="#1e293b" />
          <circle cx="-35" cy="-2" r="3" fill="#1e293b" />
          <circle cx="-46" cy="-3" r="1" fill="white" opacity="0.8" />
          <circle cx="-36" cy="-3" r="1" fill="white" opacity="0.8" />

          <ellipse cx="-40" cy="5" rx="3.5" ry="2" fill="#fb7185" />

          <line x1="-50" y1="3" x2="-60" y2="0" stroke="#cbd5e1" strokeWidth="0.5" />
          <line x1="-50" y1="5" x2="-60" y2="5" stroke="#cbd5e1" strokeWidth="0.5" />
          <line x1="-30" y1="3" x2="-20" y2="0" stroke="#cbd5e1" strokeWidth="0.5" />
          <line x1="-30" y1="5" x2="-20" y2="5" stroke="#cbd5e1" strokeWidth="0.5" />

          {frontExt ? (
            <>
              <rect x="-32" y="-22" width="7" height="26" rx="3" fill="#f97316" transform="rotate(30, -32, -10)" />
              <rect x="-32" y="-4" width="7" height="26" rx="3" fill="#f97316" transform="rotate(-30, -32, 10)" />
            </>
          ) : (
            <>
              <rect x="-28" y="-10" width="5" height="13" rx="2" fill="#f97316" transform="rotate(15, -28, -5)" />
              <rect x="-28" y="-2" width="5" height="13" rx="2" fill="#f97316" transform="rotate(-15, -28, 5)" />
            </>
          )}
        </g>

        </g>
        <g>
          <rect x="0" y={vbH - 12} width={vbW} height="12" fill="url(#groundGrad)" />
          <text x={vbW / 2} y={vbH - 2} textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="12">Ground</text>
        </g>
        <g filter="url(#catGlow)">
          <circle cx={vbW - 20} cy={20} r="8" fill="rgba(249,115,22,0.4)" />
        </g>

        {/* Educational labels */}
        {/* Angular momentum conservation curve showing L over time */}
        <path d={`M 10 ${vbH * 0.15} L ${vbW * 0.25} ${vbH * 0.7} L ${vbW * 0.5} ${vbH * 0.2} L ${vbW * 0.75} ${vbH * 0.65} L ${vbW * 0.95} ${vbH * 0.15}`} fill="none" stroke="rgba(249,115,22,0.25)" strokeWidth="2" strokeDasharray="6 3" />
        <text x={12} y={18} fill="rgba(255,255,255,0.9)" fontSize="12" fontWeight="bold">Angular Momentum</text>
        <text x={12} y={34} fill="rgba(191,219,254,0.95)" fontSize="11">L = I × ω</text>
        <text x={vbW - 12} y={vbH - 20} textAnchor="end" fill="rgba(110,231,183,0.95)" fontSize="11">I₁ω₁ = I₂ω₂</text>
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE RENDERERS
  // ─────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      padding: isMobile ? '20px' : '40px',
      textAlign: 'center',
    }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: `${colors.accent}15`,
        border: `1px solid ${colors.accent}30`,
        borderRadius: '24px',
        marginBottom: '24px',
      }}>
        <span style={{
          width: '8px',
          height: '8px',
          backgroundColor: colors.accent,
          borderRadius: '50%',
          animation: 'pulse 2s infinite',
        }} />
        <span style={{ fontSize: typo.small.fontSize, fontWeight: 500, color: colors.accent }}>
          PHYSICS EXPLORATION
        </span>
      </div>

      <h1 style={{
        ...typo.h1,
        background: `linear-gradient(135deg, ${colors.textPrimary}, ${colors.accentLight})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '16px',
      }}>
        The Cat Righting Reflex
      </h1>

      <p style={{
        ...typo.body,
        color: colors.textSecondary,
        maxWidth: '500px',
        marginBottom: '32px',
      }}>
        How do cats always land on their feet, even when dropped upside down with nothing to push against?
      </p>

      <div style={{
        backgroundColor: colors.bgCard,
        borderRadius: '24px',
        padding: isMobile ? '24px' : '32px',
        maxWidth: '500px',
        border: `1px solid ${colors.border}`,
        marginBottom: '32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}>
        <div style={{ marginBottom: '24px' }}>
          {renderCat(catRotation, frontLegsExtended, backLegsExtended, isMobile ? 200 : 240)}
        </div>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          marginBottom: '16px',
        }}>
          Cats can rotate 180 degrees in just <span style={{ color: colors.accent, fontWeight: 600 }}>0.3 seconds</span> while falling!
        </p>

        <button
          onClick={startAnimation}
          disabled={isAnimating}
          style={{
            padding: '12px 24px',
            backgroundColor: colors.bgSecondary,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            color: colors.textPrimary,
            fontSize: typo.body.fontSize,
            fontWeight: 500,
            cursor: isAnimating ? 'not-allowed' : 'pointer',
            opacity: isAnimating ? 0.5 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          {isAnimating ? 'Falling...' : 'Watch Cat Fall'}
        </button>
      </div>

      <button
        onClick={() => goToPhase('predict')}
        style={{
          padding: '16px 32px',
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})`,
          border: 'none',
          borderRadius: '16px',
          color: colors.textPrimary,
          fontSize: typo.body.fontSize,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: `0 8px 32px ${colors.accentGlow}`,
          transition: 'all 0.2s ease',
        }}
      >
        Discover the Secret
      </button>

      {renderNavDots()}
    </div>
  );

  const renderPredict = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: isMobile ? '20px' : '40px',
      maxWidth: '700px',
      margin: '0 auto',
    }}>
      <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
        Make Your Prediction
      </h2>

      <div style={{
        backgroundColor: colors.bgCard,
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '24px',
        border: `1px solid ${colors.border}`,
        width: '100%',
      }}>
        <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
          A cat is dropped upside down in free fall. How does it manage to rotate and land on its feet?
        </p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {renderCat(180, false, true, 160)}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        {[
          { id: 'A', text: 'It pushes against the air like swimming' },
          { id: 'B', text: 'Gravity pulls one side down first' },
          { id: 'C', text: 'It extends/retracts limbs to redistribute angular momentum', correct: true },
          { id: 'D', text: 'Cats have a special anti-gravity organ' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => {
              setPrediction(option.id);
              setShowPredictionFeedback(true);
              playSound(option.correct ? 'success' : 'failure');
            }}
            disabled={showPredictionFeedback}
            style={{
              padding: '16px 20px',
              backgroundColor: showPredictionFeedback && prediction === option.id
                ? (option.correct ? `${colors.success}30` : `${colors.error}30`)
                : showPredictionFeedback && option.correct
                ? `${colors.success}30`
                : colors.bgCard,
              border: `2px solid ${
                showPredictionFeedback && prediction === option.id
                  ? (option.correct ? colors.success : colors.error)
                  : showPredictionFeedback && option.correct
                  ? colors.success
                  : colors.border
              }`,
              borderRadius: '12px',
              textAlign: 'left',
              cursor: showPredictionFeedback ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontWeight: 700, color: colors.textPrimary }}>{option.id}.</span>
            <span style={{ color: colors.textSecondary, marginLeft: '8px' }}>{option.text}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div style={{
          marginTop: '24px',
          padding: '20px',
          backgroundColor: colors.bgCard,
          borderRadius: '16px',
          border: `1px solid ${colors.border}`,
          width: '100%',
          textAlign: 'center',
        }}>
          <p style={{ color: colors.success, fontWeight: 600, marginBottom: '8px' }}>
            Correct! Cats use angular momentum transfer between body parts!
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '16px' }}>
            By extending one set of legs while tucking the other, they can rotate without external torque.
          </p>
          <button
            onClick={() => goToPhase('play')}
            style={{
              padding: '14px 28px',
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})`,
              border: 'none',
              borderRadius: '12px',
              color: colors.textPrimary,
              fontSize: typo.body.fontSize,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Explore the Physics
          </button>
        </div>
      )}

      {renderNavDots()}
    </div>
  );

  const renderPlay = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: isMobile ? '20px' : '40px',
      maxWidth: '800px',
      margin: '0 auto',
    }}>
      <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
        Cat Righting Lab
      </h2>

      <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px', maxWidth: '600px' }}>
        This visualization demonstrates how cats rotate in mid-air using angular momentum transfer.
        Watch how the cat changes its body configuration to achieve rotation. This principle is important
        for understanding spacecraft attitude control and how engineers design self-righting robots.
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
            backgroundColor: colors.bgCard,
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '24px',
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              {renderCat(
                isAnimating ? catRotation : manualRotation,
                isAnimating ? frontLegsExtended : manualFrontExtended,
                isAnimating ? backLegsExtended : manualBackExtended,
                isMobile ? 220 : 280,
                showPhaseLabels
              )}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '24px',
              marginBottom: '16px',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: colors.accent }}>
                  {Math.round(180 - (isAnimating ? catRotation : manualRotation))}°
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Rotation</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: colors.success }}>
                  {isAnimating ? Math.round(fallProgress) : 0}%
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Fall Progress</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '16px',
            width: '100%',
            marginBottom: '24px',
          }}>
            <button
              onClick={startAnimation}
              disabled={isAnimating}
              style={{
                padding: '16px',
                backgroundColor: colors.accent,
                border: 'none',
                borderRadius: '12px',
                color: colors.textPrimary,
                fontWeight: 600,
                cursor: isAnimating ? 'not-allowed' : 'pointer',
                opacity: isAnimating ? 0.6 : 1,
              }}
            >
              {isAnimating ? 'Falling...' : 'Start Cat Drop'}
            </button>
            <button
              onClick={() => setShowPhaseLabels(!showPhaseLabels)}
              style={{
                padding: '16px',
                backgroundColor: showPhaseLabels ? colors.purple : colors.bgCard,
                border: `1px solid ${showPhaseLabels ? colors.purple : colors.border}`,
                borderRadius: '12px',
                color: colors.textPrimary,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Labels: {showPhaseLabels ? 'ON' : 'OFF'}
            </button>
          </div>

          {!isAnimating && (
            <div style={{
              width: '100%',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '12px', textAlign: 'center' }}>
                Manual Controls - Try different leg configurations:
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
                <button
                  onClick={() => setManualFrontExtended(!manualFrontExtended)}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: manualFrontExtended ? colors.success : colors.bgCard,
                    border: `1px solid ${manualFrontExtended ? colors.success : colors.border}`,
                    borderRadius: '8px',
                    color: colors.textPrimary,
                    fontSize: typo.small.fontSize,
                    cursor: 'pointer',
                  }}
                >
                  Front: {manualFrontExtended ? 'Extended' : 'Tucked'}
                </button>
                <button
                  onClick={() => setManualBackExtended(!manualBackExtended)}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: manualBackExtended ? colors.success : colors.bgCard,
                    border: `1px solid ${manualBackExtended ? colors.success : colors.border}`,
                    borderRadius: '8px',
                    color: colors.textPrimary,
                    fontSize: typo.small.fontSize,
                    cursor: 'pointer',
                  }}
                >
                  Back: {manualBackExtended ? 'Extended' : 'Tucked'}
                </button>
              </div>
              <div style={{ padding: '0 16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: colors.textSecondary, fontWeight: 500, textAlign: 'center' }}>
                  Rotation Angle Control
                </label>
                <input
                  type="range"
                  min="0"
                  max="180"
                  value={manualRotation}
                  onChange={(e) => setManualRotation(Number(e.target.value))}
                  style={{ width: '100%', height: '20px', touchAction: 'pan-y', accentColor: colors.accent, background: colors.bgSecondary }}
                  aria-label="Cat rotation angle"
                />
                <p style={{ ...typo.label, color: colors.textSecondary, textAlign: 'center' }}>
                  Angle: {manualRotation}° (180° = upside down)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{
        backgroundColor: colors.bgCard,
        borderRadius: '16px',
        padding: '20px',
        maxWidth: '600px',
        border: `1px solid ${colors.border}`,
      }}>
        <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
          The Two-Phase Righting Reflex:
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{
              padding: '4px 8px',
              backgroundColor: colors.accent,
              borderRadius: '6px',
              fontSize: typo.label.fontSize,
              fontWeight: 700,
              color: colors.textPrimary,
            }}>Phase 1</span>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              Front legs tuck (small I, fast rotation), back legs extend (large I, slow counter-rotation).
              Net result: front half rotates more!
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{
              padding: '4px 8px',
              backgroundColor: colors.warning,
              borderRadius: '6px',
              fontSize: typo.label.fontSize,
              fontWeight: 700,
              color: colors.textPrimary,
            }}>Phase 2</span>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              Swap! Front legs extend, back legs tuck. Now back half catches up with more rotation.
              Cat is now upright!
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('review')}
        style={{
          marginTop: '24px',
          padding: '14px 28px',
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})`,
          border: 'none',
          borderRadius: '12px',
          color: colors.textPrimary,
          fontSize: typo.body.fontSize,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Review the Concepts
      </button>

      {renderNavDots()}
    </div>
  );

  const renderReview = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: isMobile ? '20px' : '40px',
      maxWidth: '900px',
      margin: '0 auto',
    }}>
      <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
        Understanding Angular Momentum Transfer
      </h2>

      <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px', maxWidth: '700px' }}>
        As you observed in the experiment, the cat rotates by redistributing angular momentum between body parts.
        Your prediction was correct - cats achieve this rotation without any external torque!
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '20px',
        width: '100%',
        marginBottom: '24px',
      }}>
        <div style={{
          background: `linear-gradient(135deg, ${colors.accent}20, ${colors.warning}10)`,
          borderRadius: '20px',
          padding: '24px',
          border: `1px solid ${colors.accent}30`,
        }}>
          <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
            The Core Principle
          </h3>
          <ul style={{ ...typo.small, color: colors.textSecondary, listStyle: 'none', padding: 0, margin: 0 }}>
            {[
              'Total angular momentum (L) stays constant (zero)',
              'L = I × ω (moment of inertia × angular velocity)',
              'If one part has small I, it rotates fast',
              'If another part has large I, it rotates slow',
              'By alternating configurations, net rotation accumulates!'
            ].map((item, i) => (
              <li key={i} style={{ marginBottom: '8px', paddingLeft: '16px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: colors.accent }}>•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${colors.purple}20, #3B82F610)`,
          borderRadius: '20px',
          padding: '24px',
          border: `1px solid ${colors.purple}30`,
        }}>
          <h3 style={{ ...typo.h3, color: colors.purple, marginBottom: '16px' }}>
            Cat&apos;s Flexible Spine
          </h3>
          <ul style={{ ...typo.small, color: colors.textSecondary, listStyle: 'none', padding: 0, margin: 0 }}>
            {[
              'Cats have an extremely flexible spine',
              'They can rotate front and back halves independently',
              '30+ vertebrae give remarkable twist ability',
              'No collarbone allows front legs to move freely',
              'Reflexes complete in under 0.3 seconds!'
            ].map((item, i) => (
              <li key={i} style={{ marginBottom: '8px', paddingLeft: '16px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: colors.purple }}>•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{
        background: `linear-gradient(135deg, ${colors.success}15, #06B6D410)`,
        borderRadius: '20px',
        padding: '24px',
        border: `1px solid ${colors.success}30`,
        width: '100%',
      }}>
        <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '16px' }}>
          The Math Behind It
        </h3>
        <div style={{ ...typo.small, color: colors.textSecondary }}>
          <p style={{ marginBottom: '8px' }}>
            <strong style={{ color: colors.textPrimary }}>Conservation:</strong> L_front + L_back = 0 (always)
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong style={{ color: colors.textPrimary }}>When front is tucked:</strong> I_front is small,
            so ω_front can be large while I_back × ω_back balances it
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong style={{ color: colors.textPrimary }}>Net effect:</strong> Front rotates 90° while back
            only counter-rotates 30°
          </p>
          <p style={{ color: colors.success, marginTop: '16px', fontWeight: 500 }}>
            Then swap configurations - back catches up while front barely moves.
            Total: 180° rotation with zero angular momentum!
          </p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{
          marginTop: '32px',
          padding: '14px 28px',
          background: `linear-gradient(135deg, ${colors.purple}, #EC4899)`,
          border: 'none',
          borderRadius: '12px',
          color: colors.textPrimary,
          fontSize: typo.body.fontSize,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Discover a Surprising Twist
      </button>

      {renderNavDots()}
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: isMobile ? '20px' : '40px',
      maxWidth: '700px',
      margin: '0 auto',
    }}>
      <h2 style={{ ...typo.h2, color: colors.purple, marginBottom: '24px', textAlign: 'center' }}>
        The Twist Challenge
      </h2>

      <div style={{
        backgroundColor: colors.bgCard,
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '24px',
        border: `1px solid ${colors.border}`,
        width: '100%',
      }}>
        <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
          Imagine an astronaut floating in the middle of a space station, not touching anything.
          They&apos;re facing the wrong direction for their task.
        </p>
        <p style={{ ...typo.body, color: colors.purple, fontWeight: 500 }}>
          Can they rotate to face a different direction without grabbing anything?
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <svg width="300" height="200" viewBox="0 0 300 200">
            <defs>
              <radialGradient id="stationGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1e293b" />
              </radialGradient>
            </defs>
            <g>
              <rect x="40" y="40" width="220" height="100" rx="12" fill="url(#stationGrad)" stroke="#475569" strokeWidth="1" />
              <circle cx="150" cy="90" r="16" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
              <text x="150" y="95" textAnchor="middle" fill="#334155" fontSize="12">?</text>
              <path d="M 110 80 Q 80 20 50 80" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4" />
              <path d="M 190 80 Q 220 20 250 80" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4" />
              <path d="M 30 30 L 100 160 L 200 40 L 270 170" fill="none" stroke="rgba(139,92,246,0.2)" strokeWidth="1.5" strokeDasharray="6 3" />
            </g>
            <text x="150" y="180" textAnchor="middle" fill="#cbd5e1" fontSize="12">Astronaut in space station</text>
          </svg>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        {[
          { id: 'A', text: 'No - without something to push against, rotation is impossible' },
          { id: 'B', text: 'Yes - they can use the same technique as cats', correct: true },
          { id: 'C', text: 'Only if they throw something' },
          { id: 'D', text: 'Only with special astronaut equipment' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => {
              setTwistPrediction(option.id);
              setShowTwistFeedback(true);
              playSound(option.correct ? 'success' : 'failure');
            }}
            disabled={showTwistFeedback}
            style={{
              padding: '16px 20px',
              backgroundColor: showTwistFeedback && twistPrediction === option.id
                ? (option.correct ? `${colors.success}30` : `${colors.error}30`)
                : showTwistFeedback && option.correct
                ? `${colors.success}30`
                : colors.bgCard,
              border: `2px solid ${
                showTwistFeedback && twistPrediction === option.id
                  ? (option.correct ? colors.success : colors.error)
                  : showTwistFeedback && option.correct
                  ? colors.success
                  : colors.border
              }`,
              borderRadius: '12px',
              textAlign: 'left',
              cursor: showTwistFeedback ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontWeight: 700, color: colors.textPrimary }}>{option.id}.</span>
            <span style={{ color: colors.textSecondary, marginLeft: '8px' }}>{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div style={{
          marginTop: '24px',
          padding: '20px',
          backgroundColor: colors.bgCard,
          borderRadius: '16px',
          border: `1px solid ${colors.border}`,
          width: '100%',
          textAlign: 'center',
        }}>
          <p style={{ color: colors.success, fontWeight: 600, marginBottom: '8px' }}>
            Yes! Astronauts can self-rotate using the exact same physics!
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '16px' }}>
            It&apos;s slower and less elegant than a cat, but the principle is identical.
            NASA trains astronauts in these maneuvers!
          </p>
          <button
            onClick={() => goToPhase('twist_play')}
            style={{
              padding: '14px 28px',
              background: `linear-gradient(135deg, ${colors.purple}, #EC4899)`,
              border: 'none',
              borderRadius: '12px',
              color: colors.textPrimary,
              fontSize: typo.body.fontSize,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            See How
          </button>
        </div>
      )}

      {renderNavDots()}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: isMobile ? '20px' : '40px',
      maxWidth: '800px',
      margin: '0 auto',
    }}>
      <h2 style={{ ...typo.h2, color: colors.purple, marginBottom: '24px' }}>
        Astronaut Self-Rotation
      </h2>

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
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '20px',
            width: '100%',
            marginBottom: '24px',
          }}>
            <div style={{
              backgroundColor: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
              textAlign: 'center',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>Cat Method</h3>
              <svg width="160" height="100" style={{ margin: '0 auto 12px' }}>
                <ellipse cx="50" cy="50" rx="20" ry="12" fill={colors.accent} />
                <ellipse cx="90" cy="50" rx="20" ry="12" fill={colors.accentLight} />
                <circle cx="115" cy="50" r="10" fill={colors.accent} />
                <polygon points="107,43 105,34 113,42" fill={colors.accent} />
                <polygon points="123,43 125,34 117,42" fill={colors.accent} />
                <path d="M30 50Q20 42 18 50" fill="none" stroke={colors.accent} strokeWidth="4" strokeLinecap="round" /><path d="M18 50Q16 58 24 55" fill="none" stroke={colors.accent} strokeWidth="4" strokeLinecap="round" />
                <path d="M50,30 A20,20 0 0 1 50,70" fill="none" stroke={colors.success} strokeWidth="2" />
                <path d="M90,70 A20,20 0 0 1 90,30" fill="none" stroke={colors.error} strokeWidth="2" />
              </svg>
              <p style={{ ...typo.label, color: colors.textMuted }}>Flexible spine rotation</p>
            </div>

            <div style={{
              backgroundColor: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
              textAlign: 'center',
            }}>
              <h3 style={{ ...typo.h3, color: colors.purple, marginBottom: '16px' }}>Astronaut Method</h3>
              <svg width="160" height="100" style={{ margin: '0 auto 12px' }}>
                <circle cx="80" cy="30" r="12" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
                <ellipse cx="80" cy="32" rx="8" ry="5" fill="#0891b2" opacity="0.8" />
                <rect x="68" y="42" width="24" height="30" rx="4" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
                <line x1="68" y1="52" x2="45" y2="35" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
                <line x1="92" y1="52" x2="115" y2="70" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
                <circle cx="45" cy="35" r="4" fill="#cbd5e1" />
                <circle cx="115" cy="70" r="4" fill="#cbd5e1" />
                <path d="M60,85 A25,25 0 0 0 100,85" fill="none" stroke={colors.purple} strokeWidth="2" />
              </svg>
              <p style={{ ...typo.label, color: colors.textMuted }}>Asymmetric arm circles</p>
            </div>
          </div>
        </div>
        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          <div style={{
            background: `linear-gradient(135deg, ${colors.purple}20, #EC489915)`,
            borderRadius: '20px',
            padding: '24px',
            border: `1px solid ${colors.purple}30`,
            width: '100%',
          }}>
        <h3 style={{ ...typo.h3, color: colors.purple, marginBottom: '16px' }}>
          Astronaut Techniques:
        </h3>
        <ul style={{ ...typo.small, color: colors.textSecondary, listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            { label: 'Arm circles:', text: 'Extend one arm, circle it while keeping the other tucked' },
            { label: 'Bicycle legs:', text: 'Pedal legs in asymmetric patterns' },
            { label: 'Hula motion:', text: 'Rotate hips while keeping shoulders fixed' },
            { label: 'Combination:', text: 'Use all limbs in coordinated asymmetric patterns' }
          ].map((item, i) => (
            <li key={i} style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>{item.label}</strong> {item.text}
            </li>
          ))}
        </ul>
        <p style={{ color: colors.purple, marginTop: '16px', fontWeight: 500 }}>
          It&apos;s slower than a cat (humans are less flexible), but the physics is identical!
        </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        style={{
          marginTop: '24px',
          padding: '14px 28px',
          background: `linear-gradient(135deg, ${colors.purple}, #EC4899)`,
          border: 'none',
          borderRadius: '12px',
          color: colors.textPrimary,
          fontSize: typo.body.fontSize,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Review the Discovery
      </button>

      {renderNavDots()}
    </div>
  );

  const renderTwistReview = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: isMobile ? '20px' : '40px',
      maxWidth: '700px',
      margin: '0 auto',
    }}>
      <h2 style={{ ...typo.h2, color: colors.purple, marginBottom: '24px' }}>
        Key Discovery
      </h2>

      <div style={{
        background: `linear-gradient(135deg, ${colors.purple}20, #EC489915)`,
        borderRadius: '20px',
        padding: '32px',
        border: `1px solid ${colors.purple}30`,
        width: '100%',
        textAlign: 'center',
      }}>
        <h3 style={{ ...typo.h2, color: colors.purple, marginBottom: '24px' }}>
          Angular Momentum Transfer Is Universal!
        </h3>

        <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '20px' }}>
          Any object with movable parts can change its orientation without external forces by:
        </p>

        <ol style={{
          ...typo.body,
          color: colors.textSecondary,
          textAlign: 'left',
          maxWidth: '400px',
          margin: '0 auto 24px',
          paddingLeft: '24px',
        }}>
          <li style={{ marginBottom: '8px' }}>Moving parts to change moment of inertia distribution</li>
          <li style={{ marginBottom: '8px' }}>Rotating different sections at different rates</li>
          <li style={{ marginBottom: '8px' }}>Repeating with reversed configuration</li>
          <li>Accumulating net rotation over multiple cycles</li>
        </ol>

        <p style={{ color: colors.success, fontWeight: 600, fontSize: typo.body.fontSize }}>
          This works in space, underwater, in mid-air - anywhere! No magic required, just physics!
        </p>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        style={{
          marginTop: '32px',
          padding: '14px 28px',
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})`,
          border: 'none',
          borderRadius: '12px',
          color: colors.textPrimary,
          fontSize: typo.body.fontSize,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Explore Real-World Applications
      </button>

      {renderNavDots()}
    </div>
  );

  const renderTransfer = () => {
    const app = realWorldApps[selectedApp];
    const allCompleted = completedApps.every(c => c);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: isMobile ? '20px' : '40px',
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
          Real-World Applications
        </h2>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          justifyContent: 'center',
          marginBottom: '24px',
        }}>
          {realWorldApps.map((a, i) => (
            <button
              key={i}
              onClick={() => setSelectedApp(i)}
              style={{
                padding: '10px 16px',
                backgroundColor: selectedApp === i ? app.color : completedApps[i] ? `${colors.success}20` : colors.bgCard,
                border: `2px solid ${selectedApp === i ? app.color : completedApps[i] ? colors.success : colors.border}`,
                borderRadius: '10px',
                color: selectedApp === i ? colors.textPrimary : completedApps[i] ? colors.success : colors.textSecondary,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {a.icon} {a.short}
            </button>
          ))}
        </div>

        <div style={{
          backgroundColor: colors.bgCard,
          borderRadius: '20px',
          padding: isMobile ? '20px' : '32px',
          border: `1px solid ${colors.border}`,
          width: '100%',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px',
          }}>
            <span style={{ fontSize: '48px' }}>{app.icon}</span>
            <div>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '4px' }}>{app.title}</h3>
              <p style={{ ...typo.small, color: app.color, fontWeight: 500 }}>{app.tagline}</p>
            </div>
          </div>

          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '20px' }}>
            {app.description}
          </p>

          <div style={{
            backgroundColor: `${app.color}15`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            borderLeft: `4px solid ${app.color}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              <strong style={{ color: app.color }}>Connection to Angular Momentum:</strong> {app.connection}
            </p>
          </div>

          <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '20px' }}>
            <strong style={{ color: colors.textPrimary }}>How it works:</strong> {app.howItWorks}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '20px',
          }}>
            {app.stats.map((stat, i) => (
              <div key={i} style={{
                backgroundColor: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 700, color: app.color }}>
                  {stat.value}
                </div>
                <div style={{ ...typo.label, color: colors.textMuted }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600, marginBottom: '8px' }}>
              Real Examples:
            </h4>
            <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              {app.examples.map((ex, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{ex}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600, marginBottom: '8px' }}>
              Key Companies & Organizations:
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {app.companies.map((company, i) => (
                <span key={i} style={{
                  padding: '4px 10px',
                  backgroundColor: colors.bgSecondary,
                  borderRadius: '6px',
                  fontSize: typo.label.fontSize,
                  color: colors.textSecondary,
                }}>
                  {company}
                </span>
              ))}
            </div>
          </div>

          <div style={{
            backgroundColor: `${colors.success}15`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              <strong style={{ color: colors.success }}>Future Impact:</strong> {app.futureImpact}
            </p>
          </div>

          {!completedApps[selectedApp] ? (
            <button
              onClick={() => {
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                playSound('complete');
              }}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: colors.success,
                border: 'none',
                borderRadius: '12px',
                color: colors.textPrimary,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Mark as Understood
            </button>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px',
              backgroundColor: `${colors.success}20`,
              borderRadius: '12px',
              color: colors.success,
              fontWeight: 600,
            }}>
              Completed
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '24px',
        }}>
          <span style={{ ...typo.small, color: colors.textMuted }}>Progress:</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {completedApps.map((completed, i) => (
              <div
                key={i}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: completed ? colors.success : colors.border,
                }}
              />
            ))}
          </div>
          <span style={{ ...typo.small, color: colors.textMuted }}>
            {completedApps.filter(c => c).length}/4
          </span>
        </div>

        {allCompleted && (
          <button
            onClick={() => goToPhase('test')}
            style={{
              marginTop: '24px',
              padding: '14px 28px',
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})`,
              border: 'none',
              borderRadius: '12px',
              color: colors.textPrimary,
              fontSize: typo.body.fontSize,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Take the Knowledge Test
          </button>
        )}

        {renderNavDots()}
      </div>
    );
  };

  const renderTest = () => {
    const question = testQuestions[currentQuestion];
    const answered = testAnswers[currentQuestion] !== null;
    const selectedOption = question.options.find(o => o.id === testAnswers[currentQuestion]);
    const isCorrect = selectedOption?.correct;

    if (testSubmitted) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: isMobile ? '20px' : '40px',
          maxWidth: '700px',
          margin: '0 auto',
          textAlign: 'center',
        }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Test Complete!
          </h2>

          <div style={{
            backgroundColor: colors.bgCard,
            borderRadius: '24px',
            padding: '32px',
            border: `1px solid ${colors.border}`,
            width: '100%',
          }}>
            <div style={{
              fontSize: '64px',
              fontWeight: 800,
              color: testScore >= 7 ? colors.success : colors.warning,
              marginBottom: '16px',
            }}>
              {testScore}/10
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              {testScore >= 7
                ? 'Excellent! You have mastered angular momentum transfer!'
                : testScore >= 5
                ? 'Good effort! Review the concepts and try again.'
                : 'Keep learning! Review the concepts and practice more.'}
            </p>

            {testScore >= 7 ? (
              <button
                onClick={() => goToPhase('mastery')}
                style={{
                  padding: '16px 32px',
                  background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                  border: 'none',
                  borderRadius: '12px',
                  color: colors.textPrimary,
                  fontSize: typo.body.fontSize,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Claim Your Mastery Badge
              </button>
            ) : (
              <button
                onClick={() => {
                  setTestAnswers(Array(10).fill(null));
                  setCurrentQuestion(0);
                  setTestSubmitted(false);
                  goToPhase('review');
                }}
                style={{
                  padding: '16px 32px',
                  background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})`,
                  border: 'none',
                  borderRadius: '12px',
                  color: colors.textPrimary,
                  fontSize: typo.body.fontSize,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Review and Try Again
              </button>
            )}
          </div>

          {renderNavDots()}
        </div>
      );
    }

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: isMobile ? '20px' : '40px',
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          marginBottom: '24px',
        }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary }}>
            Knowledge Test
          </h2>
          <span style={{
            padding: '8px 16px',
            backgroundColor: colors.bgCard,
            borderRadius: '20px',
            color: colors.textSecondary,
            fontWeight: 500,
          }}>
            Question {currentQuestion + 1} of 10
          </span>
        </div>

        <div style={{
          width: '100%',
          height: '6px',
          backgroundColor: colors.bgCard,
          borderRadius: '3px',
          marginBottom: '24px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${((currentQuestion + 1) / 10) * 100}%`,
            height: '100%',
            backgroundColor: colors.accent,
            borderRadius: '3px',
            transition: 'width 0.3s ease',
          }} />
        </div>

        <div style={{
          backgroundColor: colors.bgCard,
          borderRadius: '20px',
          padding: '24px',
          border: `1px solid ${colors.border}`,
          width: '100%',
          marginBottom: '20px',
        }}>
          <p style={{
            ...typo.small,
            color: colors.textMuted,
            fontStyle: 'italic',
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: colors.bgSecondary,
            borderRadius: '8px',
          }}>
            {question.scenario}
          </p>
          <p style={{ ...typo.body, color: colors.textPrimary, fontWeight: 500 }}>
            {question.question}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          {question.options.map(option => (
            <button
              key={option.id}
              onClick={() => {
                if (!answered) {
                  const newAnswers = [...testAnswers];
                  newAnswers[currentQuestion] = option.id;
                  setTestAnswers(newAnswers);
                  playSound(option.correct ? 'success' : 'failure');
                }
              }}
              disabled={answered}
              style={{
                padding: '16px 20px',
                backgroundColor: answered
                  ? option.correct
                    ? `${colors.success}30`
                    : testAnswers[currentQuestion] === option.id
                    ? `${colors.error}30`
                    : colors.bgCard
                  : colors.bgCard,
                border: `2px solid ${
                  answered
                    ? option.correct
                      ? colors.success
                      : testAnswers[currentQuestion] === option.id
                      ? colors.error
                      : colors.border
                    : colors.border
                }`,
                borderRadius: '12px',
                textAlign: 'left',
                cursor: answered ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontWeight: 700, color: colors.textPrimary }}>{option.id.toUpperCase()}.</span>
              <span style={{ color: colors.textSecondary, marginLeft: '8px' }}>{option.label}</span>
            </button>
          ))}
        </div>

        {answered && (
          <div style={{
            marginTop: '20px',
            padding: '20px',
            backgroundColor: isCorrect ? `${colors.success}15` : `${colors.error}15`,
            borderRadius: '12px',
            border: `1px solid ${isCorrect ? colors.success : colors.error}30`,
            width: '100%',
          }}>
            <p style={{
              ...typo.small,
              color: isCorrect ? colors.success : colors.error,
              fontWeight: 600,
              marginBottom: '8px',
            }}>
              {isCorrect ? 'Correct!' : 'Not quite right.'}
            </p>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              {question.explanation}
            </p>
          </div>
        )}

        {answered && (
          <button
            onClick={() => {
              if (currentQuestion < 9) {
                setCurrentQuestion(currentQuestion + 1);
              } else {
                const score = testAnswers.reduce((acc, ans, i) => {
                  const q = testQuestions[i];
                  const correct = q.options.find(o => o.id === ans)?.correct;
                  return acc + (correct ? 1 : 0);
                }, 0);
                setTestScore(score);
                setTestSubmitted(true);
                playSound('complete');
              }
            }}
            style={{
              marginTop: '24px',
              padding: '14px 28px',
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})`,
              border: 'none',
              borderRadius: '12px',
              color: colors.textPrimary,
              fontSize: typo.body.fontSize,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {currentQuestion < 9 ? 'Next Question' : 'See Results'}
          </button>
        )}

        {renderNavDots()}
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      padding: isMobile ? '20px' : '40px',
      textAlign: 'center',
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${colors.accent}20, ${colors.warning}15, ${colors.success}10)`,
        borderRadius: '32px',
        padding: isMobile ? '32px' : '48px',
        maxWidth: '600px',
        border: `1px solid ${colors.accent}30`,
      }}>
        <div style={{ fontSize: '80px', marginBottom: '24px' }}>
          🎓
        </div>

        <h1 style={{
          ...typo.h1,
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.warning}, ${colors.success})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px',
        }}>
          Angular Momentum Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
          You have mastered the physics of angular momentum transfer and the cat righting reflex!
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          marginBottom: '32px',
        }}>
          {[
            { icon: '🔄', title: 'Momentum Transfer', subtitle: 'Understood' },
            { icon: '🐱', title: 'Cat Righting', subtitle: 'Mastered' },
            { icon: '🚀', title: 'Space Physics', subtitle: 'Applied' },
            { icon: '⚖️', title: 'Moment of Inertia', subtitle: 'Calculated' }
          ].map((item, i) => (
            <div key={i} style={{
              backgroundColor: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ fontWeight: 600, color: colors.textPrimary, marginBottom: '4px' }}>
                {item.title}
              </div>
              <div style={{ ...typo.small, color: colors.success }}>{item.subtitle}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            onClick={() => {
              setPhase('hook');
              setPrediction(null);
              setShowPredictionFeedback(false);
              setTwistPrediction(null);
              setShowTwistFeedback(false);
              setTestAnswers(Array(10).fill(null));
              setCurrentQuestion(0);
              setTestSubmitted(false);
              setCompletedApps([false, false, false, false]);
            }}
            style={{
              padding: '14px 24px',
              backgroundColor: colors.bgCard,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              color: colors.textSecondary,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Explore Again
          </button>
        </div>
      </div>

      {renderNavDots()}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────

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
      default: return renderHook();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: colors.bgPrimary,
      color: colors.textPrimary,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background gradients */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(circle at 20% 20%, ${colors.accent}08 0%, transparent 50%),
                     radial-gradient(circle at 80% 80%, ${colors.warning}05 0%, transparent 50%)`,
        pointerEvents: 'none',
      }} />

      {renderProgressBar()}

      <div style={{
        flex: 1,
        overflowY: 'auto',
        position: 'relative',
        zIndex: 10,
        paddingTop: '48px',
        paddingBottom: '100px',
      }}>
        {renderPhase()}
      </div>

      {renderBottomBar()}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default AngularMomentumTransferRenderer;
