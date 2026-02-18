'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// NEWTON'S THIRD LAW RENDERER - Premium 10-Phase Learning Experience
// ============================================================================
// Teaches Newton's Third Law: For every action, there is an equal and opposite reaction
// Features: Balloon rocket simulation, action-reaction force visualization
// ============================================================================

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
  'play': 'Experiment',
  'review': 'Review',
  'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Experiment',
  'twist_review': 'Twist Review',
  'transfer': 'Transfer',
  'test': 'Test',
  'mastery': 'Mastery'
};

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications with stats
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🚀',
    title: 'Rocket Propulsion',
    short: 'Spacecraft engines expel mass to generate thrust',
    tagline: 'Every launch is Newton in action',
    description: 'Rocket engines work by expelling high-velocity exhaust gases downward. According to Newton\'s Third Law, the gases push back on the rocket with equal force, propelling it upward. This principle works even in the vacuum of space.',
    connection: 'The action of expelling gas creates an equal and opposite reaction force that accelerates the rocket, demonstrating F_action = -F_reaction in its purest form.',
    howItWorks: 'Combustion chambers burn fuel and oxidizer at extreme temperatures, accelerating exhaust to 2-4 km/s. The mass flow rate times exhaust velocity equals thrust. Multiple engines provide millions of pounds of force.',
    stats: [
      { value: '7.5M', label: 'lbs thrust (Saturn V)', icon: '🔥' },
      { value: '4 km/s', label: 'exhaust velocity', icon: '💨' },
      { value: '$62B', label: 'space industry', icon: '📈' }
    ],
    examples: ['SpaceX Falcon 9 launches', 'NASA Space Launch System', 'Satellite maneuvering thrusters', 'Mars rover landing rockets'],
    companies: ['SpaceX', 'NASA', 'Blue Origin', 'Rocket Lab'],
    futureImpact: 'Ion propulsion and nuclear thermal rockets will enable faster interplanetary travel, while reusable rockets make space access affordable for humanity.',
    color: '#EF4444'
  },
  {
    icon: '🏊',
    title: 'Swimming Mechanics',
    short: 'Swimmers push water backward to move forward',
    tagline: 'Every stroke is physics in motion',
    description: 'Swimmers propel themselves by pushing water backward with their hands and feet. The water pushes back with equal force, driving the swimmer forward. Olympic swimmers optimize stroke mechanics to maximize this reaction force.',
    connection: 'The swimmer\'s hands push water backward (action), and the water pushes the swimmer forward (reaction). The larger the mass of water moved and the faster it\'s pushed, the greater the propulsion.',
    howItWorks: 'Efficient swimming requires high catch and pull phases where hands act as paddles. The angle of attack, stroke rate, and body position all affect how much water is displaced and the resulting forward thrust.',
    stats: [
      { value: '60+', label: 'lbs force per stroke', icon: '💪' },
      { value: '2.2', label: 'm/s sprint speed', icon: '⚡' },
      { value: '8M+', label: 'competitive swimmers', icon: '🌊' }
    ],
    examples: ['Olympic freestyle sprints', 'Underwater dolphin kicks', 'Synchronized swimming', 'Rescue swimmer training'],
    companies: ['USA Swimming', 'Speedo', 'Arena', 'TYR Sport'],
    futureImpact: 'Biomechanical analysis and smart swimsuits will continue optimizing how swimmers apply Newton\'s Third Law for faster times.',
    color: '#3B82F6'
  },
  {
    icon: '✈️',
    title: 'Jet Engine Thrust',
    short: 'Aircraft accelerate air backward for forward motion',
    tagline: 'Billions of air molecules become propulsion',
    description: 'Jet engines intake air, compress it, mix with fuel, ignite, and expel hot gases at high velocity. The accelerated exhaust creates a reaction force that pushes the aircraft forward, enabling flight at hundreds of miles per hour.',
    connection: 'The engine accelerates air molecules backward (action), creating a continuous reaction force that propels the aircraft forward. Thrust equals mass flow rate times velocity change.',
    howItWorks: 'Compressor stages increase air pressure 30-40x. Combustion raises temperature to 1,500 degrees C. Turbines extract energy to drive compressors while remaining exhaust provides thrust. Bypass air in turbofans adds efficiency.',
    stats: [
      { value: '100K', label: 'lbs thrust (777)', icon: '🔥' },
      { value: '600', label: 'mph cruise speed', icon: '✈️' },
      { value: '$838B', label: 'aviation market', icon: '📈' }
    ],
    examples: ['Commercial airliner takeoff', 'Fighter jet afterburners', 'Cargo aircraft operations', 'Private jet travel'],
    companies: ['GE Aviation', 'Rolls-Royce', 'Pratt & Whitney', 'Safran'],
    futureImpact: 'Sustainable aviation fuels and hydrogen-powered engines will reduce emissions while maintaining the thrust principles that enable global air travel.',
    color: '#10B981'
  },
  {
    icon: '🔫',
    title: 'Firearm Recoil',
    short: 'Guns kick back when bullets are fired forward',
    tagline: 'Equal and opposite in milliseconds',
    description: 'When a firearm is discharged, expanding gases propel the bullet forward while simultaneously pushing the gun backward. This recoil force is exactly equal to the force accelerating the bullet, just applied to a heavier mass.',
    connection: 'The bullet accelerates forward (action) while the gun accelerates backward (reaction). Because the gun is much heavier, it moves slower but the momentum change is identical.',
    howItWorks: 'Ignited gunpowder creates gases at 20,000+ PSI. These gases accelerate the bullet down the barrel while pushing equally against the breach. Recoil mitigation uses mass, springs, and gas-operated systems.',
    stats: [
      { value: '1,200', label: 'm/s muzzle velocity', icon: '⚡' },
      { value: '15-25', label: 'ft-lbs recoil energy', icon: '💥' },
      { value: '$20B', label: 'firearms industry', icon: '📈' }
    ],
    examples: ['Handgun recoil management', 'Rifle shoulder impact', 'Artillery gun recoil systems', 'Naval gun stabilization'],
    companies: ['Smith & Wesson', 'Glock', 'Remington', 'Beretta'],
    futureImpact: 'Advanced recoil reduction systems and smart firearms will improve accuracy and safety while the physics of action-reaction remains unchanged.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A SpaceX Falcon 9 rocket launches from Cape Canaveral, producing a massive plume of fire and exhaust gases shooting downward as the rocket accelerates upward toward space.",
    question: "What force causes the rocket to accelerate upward according to Newton's Third Law?",
    options: [
      { id: 'a', label: "The exhaust gases pushing against the launch pad" },
      { id: 'b', label: "The rocket pushes exhaust gases downward, and the gases push the rocket upward with an equal and opposite force", correct: true },
      { id: 'c', label: "The fuel burning creates an upward explosion" },
      { id: 'd', label: "Air pressure beneath the rocket lifts it up" }
    ],
    explanation: "Newton's Third Law states that for every action, there is an equal and opposite reaction. The rocket expels exhaust gases at high velocity downward (action), and those gases exert an equal force upward on the rocket (reaction). This works even in the vacuum of space because the rocket pushes against its own exhaust, not the ground or air."
  },
  {
    scenario: "A competitive swimmer pushes off the pool wall at the start of a race. The wall is solid concrete and doesn't move, yet the swimmer shoots through the water at high speed.",
    question: "How does Newton's Third Law explain the swimmer's motion if the wall doesn't move?",
    options: [
      { id: 'a', label: "The water behind the swimmer pushes them forward" },
      { id: 'b', label: "The swimmer pushes on the wall (action), and the wall pushes back on the swimmer with equal force (reaction), accelerating them forward", correct: true },
      { id: 'c', label: "The swimmer's legs store energy that releases when straightened" },
      { id: 'd', label: "The wall absorbs the push and converts it to forward motion" }
    ],
    explanation: "The swimmer exerts a force on the wall, and by Newton's Third Law, the wall exerts an equal and opposite force on the swimmer. The wall doesn't move because it's attached to the massive pool structure, but the swimmer, being much lighter and free to move, accelerates rapidly in the opposite direction."
  },
  {
    scenario: "A hunter fires a shotgun while not bracing properly. The gun kicks backward sharply, bruising the hunter's shoulder. The shotgun slug travels forward at 1,500 feet per second.",
    question: "Why does the gun recoil backward when the bullet is fired forward?",
    options: [
      { id: 'a', label: "The explosion pushes in all directions including backward" },
      { id: 'b', label: "Air rushing into the barrel pushes the gun back" },
      { id: 'c', label: "The gun exerts a forward force on the bullet, and the bullet exerts an equal backward force on the gun", correct: true },
      { id: 'd', label: "The noise of the shot creates a shockwave that pushes the gun" }
    ],
    explanation: "The gun pushes the bullet forward with great force, and by Newton's Third Law, the bullet pushes the gun backward with equal force. The bullet accelerates more because it has less mass (F=ma, same force, smaller mass means greater acceleration). The recoil is the reaction force that the shooter must absorb."
  },
  {
    scenario: "An ice skater stands still on a frozen pond and pushes a heavy crate away from herself. As the crate slides away, the skater notices she is also moving - in the opposite direction.",
    question: "What explains why both the skater and the crate move in opposite directions?",
    options: [
      { id: 'a', label: "The ice is too slippery to stay in place" },
      { id: 'b', label: "When the skater pushes the crate (action), the crate pushes back on the skater (reaction) with equal force, causing both to move", correct: true },
      { id: 'c', label: "The wind created by pushing the crate blows the skater backward" },
      { id: 'd', label: "The crate's momentum transfers to the skater" }
    ],
    explanation: "Newton's Third Law applies to both objects. The skater pushes on the crate, and the crate pushes back on the skater with an equal and opposite force. On the low-friction ice, neither can resist this force, so both move. The skater moves slower because she has more mass than the crate would accelerate from the same force."
  },
  {
    scenario: "A squid jets through the ocean by forcefully expelling water from its body cavity through a siphon. Marine biologists observe that the squid can rapidly change direction by adjusting which way the siphon points.",
    question: "How does Newton's Third Law explain the squid's propulsion?",
    options: [
      { id: 'a', label: "The squid grabs the water with its tentacles and pulls itself forward" },
      { id: 'b', label: "Ocean currents assist the squid's movement" },
      { id: 'c', label: "The squid pushes water out in one direction, and the water pushes the squid in the opposite direction", correct: true },
      { id: 'd', label: "The squid uses its fins to swim like a fish" }
    ],
    explanation: "The squid expels water at high velocity through its siphon (action force on the water). By Newton's Third Law, the water exerts an equal and opposite force on the squid (reaction). This is the same principle rockets use - jet propulsion. By pointing the siphon different directions, the squid controls its direction of travel."
  },
  {
    scenario: "A rowboat sits still on a calm lake. When the rower pulls the oars through the water, the boat moves forward. A physics student on shore wonders why pushing water backward makes the boat go forward.",
    question: "According to Newton's Third Law, what causes the boat to move forward?",
    options: [
      { id: 'a', label: "The oars lever the boat forward like a catapult" },
      { id: 'b', label: "The oars push water backward (action), and the water pushes forward on the oars and boat (reaction)", correct: true },
      { id: 'c', label: "The oars create a vacuum in front of the boat that pulls it forward" },
      { id: 'd', label: "The rower's weight shifts forward, pulling the boat along" }
    ],
    explanation: "When the oars push water backward, Newton's Third Law means the water pushes forward on the oars with equal force. This reaction force is transmitted through the oars to the boat, propelling it forward. The harder and faster the water is pushed back, the stronger the forward reaction force."
  },
  {
    scenario: "Two astronauts are floating in the International Space Station. They face each other, place their palms together, and push. Both astronauts float backward away from each other.",
    question: "Why do both astronauts move even though they're pushing against each other?",
    options: [
      { id: 'a', label: "The air in the station pushes them apart" },
      { id: 'b', label: "They both exert equal forces on each other; each astronaut feels the reaction force from the other and accelerates backward", correct: true },
      { id: 'c', label: "The station's rotation flings them apart" },
      { id: 'd', label: "Magnetic forces in their suits repel each other" }
    ],
    explanation: "When astronaut A pushes on astronaut B, by Newton's Third Law, astronaut B pushes back on astronaut A with equal force. Each astronaut experiences a force pushing them backward. In the weightless environment with no friction to resist, both accelerate away from each other."
  },
  {
    scenario: "A fire hose sprays water at very high pressure. Firefighters must brace themselves and sometimes require multiple people to hold the hose steady, or it will whip around dangerously.",
    question: "What causes the fire hose to push backward so forcefully?",
    options: [
      { id: 'a', label: "The water pressure builds up inside the hose and pushes outward in all directions" },
      { id: 'b', label: "The hose pushes water forward at high speed (action), and the water pushes backward on the hose (reaction) with equal force", correct: true },
      { id: 'c', label: "Air mixed with the water creates thrust" },
      { id: 'd', label: "The pump vibrations cause the hose to shake" }
    ],
    explanation: "As water accelerates out of the nozzle, the hose exerts a forward force on the water. Newton's Third Law dictates that the water exerts an equal backward force on the hose. The more water expelled per second and the faster it travels, the greater this reaction force becomes, requiring firefighters to brace against it."
  },
  {
    scenario: "A helicopter hovers motionless in the air. Its rotor blades spin rapidly, pushing air downward. A physics student asks why pushing air down keeps the helicopter up.",
    question: "How does Newton's Third Law explain how a helicopter generates lift?",
    options: [
      { id: 'a', label: "The spinning blades create a vacuum above the helicopter" },
      { id: 'b', label: "The rotor pushes air downward (action), and the air pushes upward on the rotor (reaction), creating lift equal to the helicopter's weight", correct: true },
      { id: 'c', label: "The engine's power directly lifts the helicopter" },
      { id: 'd', label: "Air pressure is higher beneath the rotors naturally" }
    ],
    explanation: "The helicopter's rotors push air downward with considerable force (action). By Newton's Third Law, the air pushes upward on the rotors (reaction) with equal force. When this upward force equals the helicopter's weight, it hovers. Pushing more air down faster creates more lift, allowing the helicopter to ascend."
  },
  {
    scenario: "A tennis player serves the ball with great force. Slow-motion replay shows that at the moment of contact, both the racket and the ball compress slightly before the ball rockets off the strings.",
    question: "What forces are acting between the racket and the ball at impact?",
    options: [
      { id: 'a', label: "Only the racket exerts force on the ball" },
      { id: 'b', label: "The racket exerts force on the ball to accelerate it forward, and the ball exerts an equal force back on the racket", correct: true },
      { id: 'c', label: "The strings store energy like a trampoline and release it" },
      { id: 'd', label: "The ball bounces off the racket without exerting any force on it" }
    ],
    explanation: "Newton's Third Law applies at every collision. The racket pushes forward on the ball with great force (accelerating the ball from rest to over 100 mph). The ball simultaneously pushes backward on the racket with equal force. This is why players feel the impact in their arm - it's the reaction force from accelerating the ball."
  }
];

interface AirParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface NewtonsThirdLawRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: Phase) => void;
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

export default function NewtonsThirdLawRenderer({ onGameEvent, gamePhase, onPhaseComplete }: NewtonsThirdLawRendererProps) {
  // Core State
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  });
  const [isMobile, setIsMobile] = useState(false);

  // Hook phase
  const [hookStep, setHookStep] = useState(0);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);

  // Play phase - Balloon rocket simulation
  const [balloonSize, setBalloonSize] = useState(50);
  const [balloonX, setBalloonX] = useState(80);
  const [isLaunched, setIsLaunched] = useState(false);
  const [airRemaining, setAirRemaining] = useState(100);
  const [airParticles, setAirParticles] = useState<AirParticle[]>([]);
  const [maxDistance, setMaxDistance] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - Size comparison
  const [smallBalloonX, setSmallBalloonX] = useState(80);
  const [largeBalloonX, setLargeBalloonX] = useState(80);
  const [twistLaunched, setTwistLaunched] = useState(false);
  const [smallAir, setSmallAir] = useState(100);
  const [largeAir, setLargeAir] = useState(100);
  const twistRef = useRef<number | null>(null);

  // Twist review
  const [twistReviewStep, setTwistReviewStep] = useState(0);

  // Transfer phase
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Test phase
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [confirmedQuestions, setConfirmedQuestions] = useState<Set<number>>(new Set());

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with external phase
  useEffect(() => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#EF4444',
    accentGlow: 'rgba(239, 68, 68, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#B0B8C4',
    textMuted: '#6B7280',
    border: '#2a2a3a',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Event emitter
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Phase navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    if (!phaseOrder.includes(newPhase) || isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(newPhase);
    // Reset state for play phases
    if (newPhase === 'play') {
      setBalloonX(80);
      setIsLaunched(false);
      setAirRemaining(100);
      setAirParticles([]);
      setMaxDistance(0);
    }
    if (newPhase === 'twist_play') {
      setSmallBalloonX(80);
      setLargeBalloonX(80);
      setTwistLaunched(false);
      setSmallAir(100);
      setLargeAir(100);
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [phase, emitEvent, onPhaseComplete]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Balloon animation
  useEffect(() => {
    if (phase === 'play' && isLaunched && airRemaining > 0) {
      const animate = () => {
        setAirRemaining(prev => {
          const newAir = prev - (balloonSize / 30);
          if (newAir <= 0) return 0;
          return newAir;
        });

        setBalloonX(prev => {
          const thrust = (balloonSize / 50) * (airRemaining / 100) * 2;
          const newX = prev + thrust;
          if (newX > maxDistance) setMaxDistance(newX);
          return Math.min(newX, 700);
        });

        // Add air particles
        setAirParticles(prev => {
          const newParticles = [...prev];
          if (airRemaining > 0) {
            for (let i = 0; i < 3; i++) {
              newParticles.push({
                id: Date.now() + i,
                x: balloonX,
                y: 100 + (Math.random() - 0.5) * 20,
                vx: -5 - Math.random() * 5,
                vy: (Math.random() - 0.5) * 3,
                life: 30,
              });
            }
          }
          return newParticles
            .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 1 }))
            .filter(p => p.life > 0 && p.x > 0);
        });

        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }
  }, [phase, isLaunched, airRemaining, balloonSize, balloonX, maxDistance]);

  // Twist animation - comparing balloon sizes
  useEffect(() => {
    if (phase === 'twist_play' && twistLaunched) {
      const animate = () => {
        setSmallAir(prev => Math.max(0, prev - 3));
        setSmallBalloonX(prev => {
          if (smallAir > 0) return Math.min(prev + 1.5, 700);
          return prev;
        });

        setLargeAir(prev => Math.max(0, prev - 1.5));
        setLargeBalloonX(prev => {
          if (largeAir > 0) return Math.min(prev + 2, 700);
          return prev;
        });

        if (smallAir > 0 || largeAir > 0) {
          twistRef.current = requestAnimationFrame(animate);
        }
      };
      twistRef.current = requestAnimationFrame(animate);

      return () => {
        if (twistRef.current) cancelAnimationFrame(twistRef.current);
      };
    }
  }, [phase, twistLaunched, smallAir, largeAir]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (twistRef.current) cancelAnimationFrame(twistRef.current);
    };
  }, []);

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'sticky',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 50,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.warning})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Fixed bottom navigation bar with Back/Next + nav dots
  const renderNavDots = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = phase === 'mastery';
    const isTestPhase = phase === 'test';

    return (
      <>
        <div style={{ height: '70px' }} />
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: colors.bgCard,
          borderTop: `1px solid ${colors.border}`,
          boxShadow: '0 -4px 12px rgba(0,0,0,0.5)',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
        }}>
          <button
            onClick={() => { if (!isFirst) goToPhase(phaseOrder[currentIndex - 1]); }}
            disabled={isFirst}
            style={{
              padding: '10px 20px',
              minHeight: '44px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: isFirst ? colors.textMuted : colors.textSecondary,
              cursor: isFirst ? 'default' : 'pointer',
              fontWeight: 600,
              opacity: isFirst ? 0.5 : 1,
              fontSize: '14px',
            }}
          >
            ← Back
          </button>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{
                  width: phase === p ? '20px' : '12px',
                  minWidth: '44px',
                  minHeight: '44px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '18px 0',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
                aria-label={phaseLabels[p]}
              >
                <span style={{
                  width: phase === p ? '20px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
                  display: 'block',
                  transition: 'all 0.3s ease',
                }} />
              </button>
            ))}
          </div>

          <button
            onClick={() => { if (!isLast && !isTestPhase) nextPhase(); }}
            disabled={isLast || isTestPhase}
            style={{
              padding: '10px 20px',
              minHeight: '44px',
              borderRadius: '8px',
              border: 'none',
              background: (isLast || isTestPhase) ? colors.border : colors.accent,
              color: 'white',
              cursor: (isLast || isTestPhase) ? 'default' : 'pointer',
              fontWeight: 600,
              opacity: (isLast || isTestPhase) ? 0.5 : 1,
              fontSize: '14px',
            }}
          >
            Next →
          </button>
        </nav>
      </>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #DC2626)`,
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

  // ==================== PHASE RENDERERS ====================

  // HOOK PHASE
  const renderHook = () => {
    const hookContent = [
      {
        title: "The Balloon Rocket",
        content: "Have you ever let go of an inflated balloon and watched it zoom across the room? What makes it fly? Today we'll discover the secret!",
        visual: "🎈",
      },
      {
        title: "Action and Reaction",
        content: "300 years ago, Isaac Newton discovered a law that explains everything from rockets to swimming to how you walk. Every push has a push back!",
        visual: "⚡",
      },
      {
        title: "From Balloons to Rockets",
        content: "The same principle that makes a balloon zoom makes rockets fly to space. Let's discover Newton's Third Law and see action-reaction pairs everywhere!",
        visual: "🚀",
      },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          {hookContent[hookStep].visual}
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          {hookContent[hookStep].title}
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          {hookContent[hookStep].content}
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          {hookContent.map((_, i) => (
            <button
              key={i}
              onClick={() => setHookStep(i)}
              style={{
                width: i === hookStep ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                border: 'none',
                background: i === hookStep ? colors.accent : colors.border,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        <button
          onClick={() => {
            playSound('click');
            if (hookStep < hookContent.length - 1) {
              setHookStep(h => h + 1);
            } else {
              nextPhase();
            }
          }}
          style={primaryButtonStyle}
        >
          {hookStep < hookContent.length - 1 ? 'Continue' : 'Make a Prediction'}
        </button>
        </div>

        {renderNavDots()}
      </div>
    );
  };

  // PREDICT PHASE
  const renderPredict = () => {
    const options = [
      { id: 'air_push', text: 'The air rushing out pushes the balloon forward', icon: '💨' },
      { id: 'lighter', text: 'The balloon gets lighter and floats up', icon: '🪶' },
      { id: 'pressure', text: 'The pressure inside makes it explode forward', icon: '💥' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px' }}>

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              🤔 Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Why does a balloon zoom forward when you let it go?
          </h2>

          {/* Predict SVG visualization */}
          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
            <svg width="100%" height="160" viewBox="0 0 600 160" style={{ display: 'block' }}>
              <defs>
                <radialGradient id="predBalloon" cx="40%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="100%" stopColor="#ef4444" />
                </radialGradient>
                <linearGradient id="predArrow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <filter id="predGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <rect width="600" height="160" fill="#030712" rx="8" />
              <g transform="translate(200, 80)">
                <ellipse cx="0" cy="0" rx="35" ry="28" fill="url(#predBalloon)" />
                <path d="M-30,8 Q-38,14 -42,22 L-42,-22 Q-38,-14 -30,-8" fill="#dc2626" />
                <circle cx="-50" cy="0" r="4" fill="#67e8f9" opacity="0.7" />
                <circle cx="-58" cy="-6" r="3" fill="#67e8f9" opacity="0.5" />
                <circle cx="-55" cy="8" r="3.5" fill="#67e8f9" opacity="0.6" />
              </g>
              <g filter="url(#predGlow)">
                <line x1="260" y1="80" x2="340" y2="80" stroke="url(#predArrow)" strokeWidth="3" />
                <polygon points="340,74 354,80 340,86" fill="#22d3ee" />
              </g>
              <text x="370" y="85" fill="#e2e8f0" fontSize="14" fontFamily="system-ui">Which way? Why?</text>
              <text x="300" y="140" textAnchor="middle" fill="#64748b" fontSize="11">Make your prediction below</text>
            </svg>
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '24px' }}>{opt.icon}</span>
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

        {renderNavDots()}
      </div>
    );
  };

  // PLAY PHASE - Interactive balloon simulation
  const renderPlay = () => {
    const displaySize = 20 + (airRemaining / 100) * (balloonSize / 100) * 20;
    const forceMagnitude = Math.round((balloonSize / 50) * (airRemaining / 100) * 10);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px' }}>

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Balloon Rocket Launch
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            This visualization shows how air escaping the balloon demonstrates Newton's Third Law. Try adjusting the slider to change the balloon size and observe how it affects thrust!
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
            Watch for the action-reaction force arrows. Understanding these forces is essential for rocket propulsion, swimming, and countless real-world applications.
          </p>

          {/* Visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <svg width="100%" height="200" viewBox="0 0 700 200" style={{ display: 'block' }}>
              <defs>
                <radialGradient id="balloonGrad" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="50%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </radialGradient>
                <linearGradient id="trackGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#374151" />
                  <stop offset="50%" stopColor="#6b7280" />
                  <stop offset="100%" stopColor="#374151" />
                </linearGradient>
                <linearGradient id="actionArrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <linearGradient id="reactionArrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fb923c" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
                <filter id="glowFilter">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="shadowFilter">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
                </filter>
                <radialGradient id="particleGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Background */}
              <g>
                <rect width="700" height="200" fill="#030712" />
                <rect x="0" y="180" width="700" height="20" fill="#111827" />
              </g>

              {/* Track */}
              <g filter="url(#shadowFilter)">
                <rect x="40" y="95" width="640" height="8" rx="4" fill="url(#trackGrad)" />
                <line x1="40" y1="103" x2="680" y2="103" stroke="#1f2937" strokeWidth="1" />
              </g>

              {/* Grid lines */}
              {[0, 100, 200, 300, 400, 500, 600].map(d => (
                <line key={`grid-${d}`} x1={50 + d} y1="30" x2={50 + d} y2="105" stroke="#4b5563" strokeDasharray="4 4" opacity="0.3" />
              ))}

              {/* Distance markers */}
              {[0, 100, 200, 300, 400, 500, 600].map(d => (
                <g key={d}>
                  <line x1={50 + d} y1="110" x2={50 + d} y2="125" stroke="#4b5563" strokeWidth="2" />
                  <text x={50 + d} y="145" textAnchor="middle" fill="#9ca3af" fontSize="11">{d}</text>
                </g>
              ))}
              <text x="350" y="170" textAnchor="middle" fill="#64748b" fontSize="11">DISTANCE (cm)</text>

              {/* Air particles */}
              {airParticles.map(p => (
                <circle key={p.id} cx={p.x} cy={p.y} r={2 + (p.life / 30) * 3} fill="#67e8f9" opacity={p.life / 30} />
              ))}

              {/* Balloon */}
              <g transform={`translate(${balloonX}, 100)`}>
                <ellipse cx={displaySize / 2} cy="0" rx={displaySize} ry={displaySize * 0.8} fill="url(#balloonGrad)" />
                <rect x={-12} y={-displaySize * 0.5} width={12} height={displaySize} fill="#dc2626" rx="2" />

                {/* Force arrows when launched */}
                {isLaunched && airRemaining > 0 && (
                  <>
                    <line x1="-20" y1="0" x2={-35 - forceMagnitude} y2="0" stroke="#22d3ee" strokeWidth="4" markerEnd="url(#arrowBlue)" />
                    <text x="-45" y="-15" textAnchor="middle" fill="#22d3ee" fontSize="11">ACTION</text>
                    <line x1={displaySize + 15} y1="0" x2={displaySize + 30 + forceMagnitude} y2="0" stroke="#fb923c" strokeWidth="4" markerEnd="url(#arrowOrange)" />
                    <text x={displaySize + 45} y="-15" textAnchor="middle" fill="#fb923c" fontSize="11">REACTION</text>
                  </>
                )}
              </g>

              {/* Force magnitude curve */}
              <path d={`M50,${180 - forceMagnitude * 3} Q200,${120 - forceMagnitude * 8} 350,${20 + forceMagnitude * 5} Q500,${120 - forceMagnitude * 8} 650,${180 - forceMagnitude * 3}`} fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.4" />

              {/* Educational labels */}
              <text x="350" y="25" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">Balloon Rocket Simulation</text>
              <text x={balloonX + 10} y="68" textAnchor="middle" fill="#fca5a5" fontSize="11">Balloon</text>
              <text x="60" y="86" fill="#9ca3af" fontSize="11">Launch Track</text>

              {/* Equation */}
              <text x="350" y="190" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontFamily="monospace">
                F = -F&#x2032; (Action-Reaction)
              </text>
            </svg>
          </div>

          {/* Controls */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Balloon Size</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{balloonSize}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={balloonSize}
                onChange={(e) => setBalloonSize(parseInt(e.target.value))}
                disabled={isLaunched}
                style={{
                  width: '100%',
                  cursor: isLaunched ? 'not-allowed' : 'pointer',
                  height: '20px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.accent} ${(balloonSize - 20) / 0.8}%, ${colors.border} ${(balloonSize - 20) / 0.8}%)`,
                  WebkitAppearance: 'none' as const,
                  touchAction: 'pan-y',
                  accentColor: '#3b82f6',
                }}
              />
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>More air = More thrust!</p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Distance Traveled</div>
              <div style={{ ...typo.h2, color: colors.accent }}>{Math.round(balloonX - 80)} cm</div>
              <div style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>Air: {Math.round(airRemaining)}%</div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
            <button
              onClick={() => { if (!isLaunched) { playSound('click'); setIsLaunched(true); } }}
              disabled={isLaunched}
              style={{
                ...primaryButtonStyle,
                background: isLaunched ? colors.border : primaryButtonStyle.background,
                cursor: isLaunched ? 'not-allowed' : 'pointer',
              }}
            >
              {isLaunched ? '🎈 Launched!' : '🚀 Launch Balloon!'}
            </button>

            {isLaunched && (
              <button
                onClick={() => {
                  setBalloonX(80);
                  setIsLaunched(false);
                  setAirRemaining(100);
                  setAirParticles([]);
                }}
                style={{
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                🔄 Reset
              </button>
            )}
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Results
          </button>
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  };

  // REVIEW PHASE
  const renderReview = () => {
    const wasCorrect = prediction === 'air_push';

    const reviewContent = [
      {
        title: "Newton's Third Law",
        content: `${wasCorrect ? "Excellent! You predicted correctly! " : "As you observed in the experiment, "}For every ACTION, there is an equal and opposite REACTION. This is expressed mathematically as:\n\nF_action = -F_reaction\n\nWhen the balloon pushes air OUT (action), the air pushes the balloon FORWARD (reaction). These forces are equal in magnitude but opposite in direction! This principle explains how rockets fly, how swimmers propel themselves through water, and why you feel a kick when firing a gun.`,
        highlight: wasCorrect,
      },
      {
        title: "Action-Reaction Pairs",
        content: "The key insight: Action and reaction forces act on DIFFERENT objects.\n\n- The balloon pushes on the air (action)\n- The air pushes on the balloon (reaction)\n\nMathematically: F_balloon_on_air = -F_air_on_balloon\n\nThey're equal in force, but because they act on different things, movement happens!",
      },
      {
        title: "Why Movement Occurs",
        content: "You might wonder: if the forces are equal, why does anything move?\n\nAnswer: The forces act on different objects! The air zooms backward (it's pushed by the balloon), and the balloon zooms forward (it's pushed by the air). Each object responds to the force on IT.\n\nThe relationship F = ma explains why: same force, different masses, different accelerations!",
      },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Understanding Action & Reaction
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
              {reviewContent[reviewStep].title}
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, whiteSpace: 'pre-line' }}>
              {reviewContent[reviewStep].content}
            </p>

            {reviewContent[reviewStep].highlight && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                background: `${colors.success}22`,
                border: `1px solid ${colors.success}44`,
                borderRadius: '12px',
              }}>
                <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                  ✓ Great thinking! You correctly identified that the escaping air pushes the balloon forward.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
              {reviewContent.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setReviewStep(i)}
                  style={{
                    width: i === reviewStep ? '24px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    border: 'none',
                    background: i === reviewStep ? colors.accent : colors.border,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              playSound('click');
              if (reviewStep < reviewContent.length - 1) {
                setReviewStep(r => r + 1);
              } else {
                nextPhase();
              }
            }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            {reviewStep < reviewContent.length - 1 ? 'Continue' : 'New Variable'}
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  };

  // TWIST PREDICT PHASE
  const renderTwistPredict = () => {
    const options = [
      { id: 'small_wins', text: "The SMALLER balloon will travel farther (it's lighter!)", icon: '🎈' },
      { id: 'large_wins', text: 'The LARGER balloon will travel farther (more air!)', icon: '🎈🎈' },
      { id: 'same_distance', text: 'Both will travel the same distance', icon: '=' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              🔄 New Variable: Balloon Size
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            If we race a small balloon against a large balloon, which travels farther?
          </h2>

          {/* Twist predict SVG */}
          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
            <svg width="100%" height="140" viewBox="0 0 600 140" style={{ display: 'block' }}>
              <defs>
                <radialGradient id="twpSmall" cx="40%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </radialGradient>
                <radialGradient id="twpLarge" cx="40%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="100%" stopColor="#ef4444" />
                </radialGradient>
                <filter id="twpGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <rect width="600" height="140" fill="#030712" rx="8" />
              <g transform="translate(120, 40)">
                <text x="-60" y="5" fill="#93c5fd" fontSize="12" fontWeight="bold">SMALL</text>
                <ellipse cx="0" cy="0" rx="15" ry="12" fill="url(#twpSmall)" />
                <rect x="20" y="-2" width="150" height="4" rx="2" fill="#374151" />
                <text x="190" y="5" fill="#64748b" fontSize="11">?</text>
              </g>
              <g transform="translate(120, 100)">
                <text x="-60" y="5" fill="#fca5a5" fontSize="12" fontWeight="bold">LARGE</text>
                <ellipse cx="0" cy="0" rx="28" ry="22" fill="url(#twpLarge)" />
                <rect x="35" y="-2" width="135" height="4" rx="2" fill="#374151" />
                <text x="190" y="5" fill="#64748b" fontSize="11">?</text>
              </g>
              <g filter="url(#twpGlow)">
                <text x="400" y="75" fill="#fbbf24" fontSize="16" textAnchor="middle" fontWeight="bold">Which wins?</text>
              </g>
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '24px' }}>{opt.icon}</span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, background: `linear-gradient(135deg, ${colors.warning}, #D97706)` }}
            >
              Test It
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  };

  // TWIST PLAY PHASE
  const renderTwistPlay = () => {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.warning, marginBottom: '8px', textAlign: 'center' }}>
            Balloon Race!
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Small balloon vs Large balloon - which wins?
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <svg width="100%" height="200" viewBox="0 0 700 200" style={{ display: 'block' }}>
              <rect width="700" height="200" fill="#030712" />

              {/* Lane labels */}
              <text x="25" y="55" fill="#93c5fd" fontSize="11" fontWeight="bold">SMALL</text>
              <text x="25" y="145" fill="#fca5a5" fontSize="11" fontWeight="bold">LARGE</text>

              {/* Tracks */}
              <rect x="60" y="45" width="620" height="8" rx="4" fill="#374151" />
              <rect x="60" y="135" width="620" height="8" rx="4" fill="#374151" />

              {/* Distance markers */}
              {[0, 100, 200, 300, 400, 500, 600].map(d => (
                <g key={d}>
                  <line x1={60 + d} y1="160" x2={60 + d} y2="175" stroke="#4b5563" strokeWidth="2" />
                  <text x={60 + d} y="190" textAnchor="middle" fill="#9ca3af" fontSize="11">{d}</text>
                </g>
              ))}

              {/* Small balloon */}
              <g transform={`translate(${smallBalloonX}, 50)`}>
                <ellipse cx="10" cy="0" rx="15" ry="12" fill="#3b82f6" />
                <rect x={-8} y={-10} width={8} height={20} fill="#1d4ed8" rx="2" />
              </g>

              {/* Large balloon */}
              <g transform={`translate(${largeBalloonX}, 140)`}>
                <ellipse cx="15" cy="0" rx="25" ry="20" fill="#ef4444" />
                <rect x={-12} y={-16} width={12} height={32} fill="#b91c1c" rx="2" />
              </g>

              {/* Winner indicator */}
              {(smallAir <= 0 && largeAir <= 0) && (
                <text x="350" y="105" textAnchor="middle" fill="#22c55e" fontSize="16" fontWeight="bold">
                  {largeBalloonX > smallBalloonX ? 'LARGE WINS!' : 'SMALL WINS!'}
                </text>
              )}
            </svg>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}>
            <div style={{
              background: `${colors.bgCard}`,
              border: `1px solid #3b82f6`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ ...typo.small, color: '#3b82f6', marginBottom: '4px' }}>Small Balloon</div>
              <div style={{ ...typo.h3, color: colors.textPrimary }}>{Math.round(smallBalloonX - 80)} cm</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Air: {Math.round(smallAir)}%</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                onClick={() => { if (!twistLaunched) { playSound('click'); setTwistLaunched(true); } }}
                disabled={twistLaunched}
                style={{
                  padding: '14px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: twistLaunched ? colors.border : `linear-gradient(135deg, ${colors.warning}, #D97706)`,
                  color: 'white',
                  fontWeight: 600,
                  cursor: twistLaunched ? 'not-allowed' : 'pointer',
                }}
              >
                {twistLaunched ? '🏁 Racing!' : '🚀 Start Race!'}
              </button>
            </div>

            <div style={{
              background: `${colors.bgCard}`,
              border: `1px solid #ef4444`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ ...typo.small, color: '#ef4444', marginBottom: '4px' }}>Large Balloon</div>
              <div style={{ ...typo.h3, color: colors.textPrimary }}>{Math.round(largeBalloonX - 80)} cm</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Air: {Math.round(largeAir)}%</div>
            </div>
          </div>

          {smallAir <= 0 && largeAir <= 0 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}44`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                🏆 The large balloon won! It traveled {Math.round(largeBalloonX - smallBalloonX)} cm farther because it had more air to push out!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%', background: `linear-gradient(135deg, ${colors.warning}, #D97706)` }}
          >
            Understand Results
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  };

  // TWIST REVIEW PHASE
  const renderTwistReview = () => {
    const wasCorrect = twistPrediction === 'large_wins';

    const reviewContent = [
      {
        title: "More Air = More Thrust Time",
        content: `${wasCorrect ? "You predicted correctly! " : ""}The larger balloon travels farther because it has more air to push out. This means it can provide thrust for LONGER.\n\nRemember: It's not just about force - it's about how LONG that force acts!`,
        highlight: wasCorrect,
      },
      {
        title: "Impulse: Force x Time",
        content: "In physics, we call this IMPULSE = Force x Time.\n\nBoth balloons push with similar force, but the larger balloon pushes for longer because it has more air. More impulse = more speed = more distance!",
      },
      {
        title: "Real Rockets Use This Principle",
        content: "This is exactly why real rockets carry so much fuel! More fuel means:\n\n- Longer burn time\n- More total impulse\n- Higher final speed\n- Greater distance traveled\n\nThe Space Shuttle carried 2 million pounds of fuel!",
      },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.warning, marginBottom: '24px', textAlign: 'center' }}>
            Size Analysis
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '16px' }}>
              {reviewContent[twistReviewStep].title}
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, whiteSpace: 'pre-line' }}>
              {reviewContent[twistReviewStep].content}
            </p>

            {reviewContent[twistReviewStep].highlight && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                background: `${colors.success}22`,
                border: `1px solid ${colors.success}44`,
                borderRadius: '12px',
              }}>
                <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                  ✓ Excellent reasoning! You understood that more air means longer thrust and greater distance.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
              {reviewContent.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTwistReviewStep(i)}
                  style={{
                    width: i === twistReviewStep ? '24px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    border: 'none',
                    background: i === twistReviewStep ? colors.warning : colors.border,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              playSound('click');
              if (twistReviewStep < reviewContent.length - 1) {
                setTwistReviewStep(t => t + 1);
              } else {
                nextPhase();
              }
            }}
            style={{ ...primaryButtonStyle, width: '100%', background: `linear-gradient(135deg, ${colors.warning}, #D97706)` }}
          >
            {twistReviewStep < reviewContent.length - 1 ? 'Continue' : 'Real-World Examples'}
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  };

  // TRANSFER PHASE
  const renderTransfer = () => {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px' }}>

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length}
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
                How Newton's Third Law Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
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

            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>How It Works:</h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.howItWorks}</p>
            </div>

            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 600 }}>Real Examples:</h4>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {app.examples.map((ex, i) => (
                  <li key={i} style={{ ...typo.small, color: colors.textSecondary, marginBottom: '4px' }}>{ex}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>Industry Leaders:</h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.companies.join(', ')}</p>
            </div>

            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ ...typo.small, color: '#a855f7', marginBottom: '8px', fontWeight: 600 }}>Future Impact:</h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.futureImpact}</p>
            </div>

            {!completedApps[selectedApp] && (
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{ ...primaryButtonStyle, width: '100%', marginTop: '16px' }}
              >
                Got It!
              </button>
            )}
          </div>

          {selectedApp < realWorldApps.length - 1 && (
            <button
              onClick={() => {
                playSound('click');
                const next = selectedApp + 1;
                setSelectedApp(next);
                const newCompleted = [...completedApps];
                newCompleted[next] = true;
                setCompletedApps(newCompleted);
              }}
              style={{ ...primaryButtonStyle, width: '100%', marginBottom: '12px', background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
            >
              Next Application →
            </button>
          )}

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Continue to Test
            </button>
          )}
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  };

  // TEST PHASE
  const renderTest = () => {
    const selectedAnswer = testAnswers[currentQuestion];
    const isConfirmed = confirmedQuestions.has(currentQuestion);

    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>{passed ? '🏆' : '📚'}</div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              You scored:
            </p>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '8px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              {passed ? "You've mastered Newton's Third Law!" : 'Review the concepts and try again.'}
            </p>

            {/* Answer Review */}
            <div style={{ textAlign: 'left', marginBottom: '24px', maxHeight: '300px', overflowY: 'auto', border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '12px' }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>Answer Review</h3>
              {testQuestions.map((q, i) => {
                const correctId = q.options.find(o => o.correct)?.id;
                const userAnswer = testAnswers[i];
                const isCorrect = userAnswer === correctId;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px',
                    borderRadius: '8px', marginBottom: '6px',
                    background: isCorrect ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${isCorrect ? colors.success : colors.error}`,
                  }}>
                    <span style={{ fontSize: '16px' }}>{isCorrect ? '✓' : '✗'}</span>
                    <span style={{ ...typo.small, color: colors.textPrimary }}>Question {i + 1}: {isCorrect ? 'Correct' : 'Incorrect'}</span>
                  </div>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => goToPhase('hook')}
                style={{ ...primaryButtonStyle, background: colors.bgCard, color: colors.textPrimary, border: `2px solid ${colors.border}` }}
              >
                Play Again
              </button>
              <button
                onClick={() => { passed ? nextPhase() : goToPhase('hook'); }}
                style={primaryButtonStyle}
              >
                {passed ? 'Go to Dashboard' : 'Review and Try Again'}
              </button>
            </div>
          </div>
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];
    const correctId = question.options.find(o => o.correct)?.id;

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} of 10
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: i === currentQuestion ? colors.accent : confirmedQuestions.has(i) ? colors.success : colors.border,
                }} />
              ))}
            </div>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px', borderLeft: `3px solid ${colors.accent}` }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{question.scenario}</p>
          </div>

          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>{question.question}</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {question.options.map(opt => {
              const isSelected = selectedAnswer === opt.id;
              const isCorrectOption = opt.id === correctId;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (isConfirmed) return;
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = opt.id;
                    setTestAnswers(newAnswers);
                  }}
                  style={{
                    background: isConfirmed && isCorrectOption ? 'rgba(34,197,94,0.2)'
                      : isConfirmed && isSelected && !isCorrectOption ? 'rgba(239,68,68,0.2)'
                      : isSelected ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${isConfirmed && isCorrectOption ? colors.success
                      : isConfirmed && isSelected && !isCorrectOption ? colors.error
                      : isSelected ? colors.accent : colors.border}`,
                    borderRadius: '10px', padding: '14px 16px', textAlign: 'left',
                    cursor: isConfirmed ? 'default' : 'pointer',
                    opacity: isConfirmed && !isSelected && !isCorrectOption ? 0.5 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{
                    display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                    background: isConfirmed && isCorrectOption ? colors.success
                      : isConfirmed && isSelected && !isCorrectOption ? colors.error
                      : isSelected ? colors.accent : colors.bgSecondary,
                    color: (isSelected || (isConfirmed && isCorrectOption)) ? 'white' : colors.textSecondary,
                    textAlign: 'center', lineHeight: '24px', marginRight: '10px', fontSize: '12px', fontWeight: 700,
                  }}>
                    {isConfirmed && isCorrectOption ? '\u2713' : isConfirmed && isSelected && !isCorrectOption ? '\u2717' : opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {isConfirmed && (
            <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(34,197,94,0.3)' }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{question.explanation}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            {selectedAnswer && !isConfirmed && (
              <button
                onClick={() => setConfirmedQuestions(prev => new Set(prev).add(currentQuestion))}
                style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                  background: `linear-gradient(135deg, ${colors.accent}, #DC2626)`, color: 'white',
                  cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s ease' }}
              >
                Check Answer
              </button>
            )}
            {isConfirmed && currentQuestion < 9 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion + 1)}
                style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                  background: `linear-gradient(135deg, ${colors.accent}, #DC2626)`, color: 'white',
                  cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s ease' }}
              >
                Next Question
              </button>
            )}
            {isConfirmed && currentQuestion === 9 && (
              <button
                onClick={() => {
                  const score = testAnswers.reduce((acc, ans, i) => {
                    const correct = testQuestions[i].options.find(o => o.correct)?.id;
                    return acc + (ans === correct ? 1 : 0);
                  }, 0);
                  setTestScore(score);
                  setTestSubmitted(true);
                }}
                style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                  background: `linear-gradient(135deg, ${colors.success}, #059669)`, color: 'white',
                  cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s ease' }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
        </div>
        {renderNavDots()}
      </div>
    );
  };

  // MASTERY PHASE
  const renderMastery = () => {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
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
          Action-Reaction Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '16px' }}>
          You now understand Newton's Third Law and can identify action-reaction pairs everywhere!
        </p>

        <p style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '32px' }}>
          Final Score: {testScore}/10 ({Math.round((testScore / 10) * 100)}%)
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Every action has an equal and opposite reaction',
              'Action-reaction forces act on different objects',
              'Rockets work by pushing exhaust backward',
              'More fuel = longer thrust = greater distance',
              'Swimming, walking, and recoil all use this law',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
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
  };

  // Render phase based on current phase
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
    <div style={{ minHeight: '100vh', background: colors.bgPrimary }}>
      {renderPhase()}
    </div>
  );
}
