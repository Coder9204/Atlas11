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
  'play': 'Lab',
  'review': 'Review',
  'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Lab',
  'twist_review': 'Twist Review',
  'transfer': 'Transfer',
  'test': 'Test',
  'mastery': 'Mastery'
};

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
    howItWorks: 'Compressor stages increase air pressure 30-40x. Combustion raises temperature to 1,500°C. Turbines extract energy to drive compressors while remaining exhaust provides thrust. Bypass air in turbofans adds efficiency.',
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
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test phase
  const [testQuestions] = useState([
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
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [testComplete, setTestComplete] = useState(false);

  // Mobile detection
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

  // Sync with external phase
  useEffect(() => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Sound effect
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds = {
        click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
        success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
        failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
        transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
        complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
      };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch { /* Audio not available */ }
  }, []);

  // Event emitter
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Simplified navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    if (!phaseOrder.includes(newPhase)) return;
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
  }, [phase, playSound, emitEvent, onPhaseComplete]);

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

  // Applications data
  const applications = [
    {
      title: "Rocket Propulsion",
      icon: "🚀",
      description: "Rockets work by pushing exhaust gases out the back at high speed. The gases push back on the rocket, propelling it forward. This works even in the vacuum of space because the rocket pushes against its own exhaust, not the air!",
      fact: "The Saturn V rocket produced 7.5 million pounds of thrust by expelling exhaust at 10,000+ mph!",
    },
    {
      title: "Swimming",
      icon: "🏊",
      description: "When you swim, you push water backward with your arms and legs. The water pushes you forward in response! Every swimming stroke is an action-reaction pair. The harder you push the water back, the faster you go forward.",
      fact: "Olympic swimmers can push against 60+ pounds of water with each stroke!",
    },
    {
      title: "Gun Recoil",
      icon: "🔫",
      description: "When a gun fires, the explosive gases push the bullet forward. By Newton's Third Law, the bullet (and gases) push the gun backward - this is recoil. Heavier guns recoil less because they have more mass to accelerate.",
      fact: "A .50 caliber rifle can recoil with over 100 foot-pounds of energy - enough to bruise if not held properly!",
    },
    {
      title: "Walking",
      icon: "🚶",
      description: "You walk by pushing backward against the ground with your foot. The ground pushes forward on your foot, propelling you forward! Without friction (like on ice), you can't push effectively and you slip.",
      fact: "Every step you take involves pushing against the Earth with hundreds of pounds of force. The Earth pushes back equally - that's why you move, not the planet!",
    },
  ];

  // ==================== PHASE RENDERERS ====================

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
      <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full mb-8">
          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-red-400 tracking-wide">PHYSICS EXPLORATION</span>
        </div>

        <div className="text-7xl mb-8">{hookContent[hookStep].visual}</div>

        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-red-100 to-orange-200 bg-clip-text text-transparent">
          {hookContent[hookStep].title}
        </h1>

        <p className="text-lg text-slate-400 max-w-md mb-10 leading-relaxed">
          {hookContent[hookStep].content}
        </p>

        <div className="flex items-center gap-2 mb-10">
          {hookContent.map((_, i) => (
            <button
              key={i}
              onClick={() => setHookStep(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === hookStep ? 'w-6 bg-red-500' : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
              style={{ zIndex: 10 }}
            />
          ))}
        </div>

        <button
          onClick={() => {
            if (hookStep < hookContent.length - 1) {
              setHookStep(h => h + 1);
            } else {
              goToPhase('predict');
            }
          }}
          className="group relative px-10 py-5 bg-gradient-to-r from-red-500 to-orange-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98]"
          style={{ zIndex: 10 }}
        >
          <span className="relative z-10 flex items-center gap-3">
            {hookStep < hookContent.length - 1 ? 'Continue' : 'Make a Prediction'}
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>
      </div>
    );
  };

  const renderPredict = () => {
    const predictions = [
      { id: 'air_push', label: 'The air rushing out pushes the balloon forward', icon: '💨' },
      { id: 'lighter', label: 'The balloon gets lighter and floats up', icon: '🪶' },
      { id: 'pressure', label: 'The pressure inside makes it explode forward', icon: '💥' },
      { id: 'magic', label: "The balloon just wants to move - no specific reason", icon: '✨' },
    ];

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Make Your Prediction</h2>
        <p className="text-slate-400 mb-8">Why does a balloon zoom forward when you let it go?</p>

        <div className="grid gap-3 w-full max-w-xl mb-8">
          {predictions.map((pred) => (
            <button
              key={pred.id}
              onClick={() => setPrediction(pred.id)}
              className={`p-5 rounded-xl text-left transition-all duration-300 flex items-center gap-4 ${
                prediction === pred.id
                  ? 'bg-red-500/20 border-2 border-red-500'
                  : 'bg-slate-800/50 border-2 border-transparent hover:bg-slate-700/50'
              }`}
              style={{ zIndex: 10 }}
            >
              <span className="text-2xl">{pred.icon}</span>
              <span className="text-slate-200">{pred.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => { if (prediction) goToPhase('play'); }}
          disabled={!prediction}
          className={`px-8 py-4 rounded-xl font-semibold transition-all ${
            prediction
              ? 'bg-gradient-to-r from-red-500 to-orange-600 text-white hover:shadow-lg hover:shadow-red-500/25'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
          style={{ zIndex: 10 }}
        >
          Test My Prediction →
        </button>
      </div>
    );
  };

  const renderPlay = () => {
    const displaySize = 20 + (airRemaining / 100) * (balloonSize / 100) * 20;
    const forceMagnitude = Math.round((balloonSize / 50) * (airRemaining / 100) * 10);

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Balloon Rocket Launch</h2>
        <p className="text-slate-400 mb-6">Inflate the balloon and watch it fly!</p>

        <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 w-full max-w-2xl">
          <svg width="100%" height="280" viewBox="0 0 700 280">
            <defs>
              {/* Premium balloon gradient with 3D depth */}
              <radialGradient id="n3lBalloonGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#fca5a5" />
                <stop offset="25%" stopColor="#f87171" />
                <stop offset="50%" stopColor="#ef4444" />
                <stop offset="75%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="#b91c1c" />
              </radialGradient>

              {/* Balloon highlight for 3D effect */}
              <radialGradient id="n3lBalloonHighlight" cx="30%" cy="25%" r="40%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>

              {/* Balloon nozzle gradient */}
              <linearGradient id="n3lNozzleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fca5a5" />
                <stop offset="30%" stopColor="#dc2626" />
                <stop offset="70%" stopColor="#991b1b" />
                <stop offset="100%" stopColor="#7f1d1d" />
              </linearGradient>

              {/* Air particle gradient */}
              <radialGradient id="n3lAirGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
                <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.7" />
                <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
              </radialGradient>

              {/* Action arrow gradient (blue - air escaping) */}
              <linearGradient id="n3lActionArrow" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="30%" stopColor="#22d3ee" />
                <stop offset="60%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>

              {/* Reaction arrow gradient (orange - balloon moving) */}
              <linearGradient id="n3lReactionArrow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fdba74" />
                <stop offset="30%" stopColor="#fb923c" />
                <stop offset="60%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>

              {/* Track/rail gradient */}
              <linearGradient id="n3lTrackGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#374151" />
                <stop offset="30%" stopColor="#4b5563" />
                <stop offset="50%" stopColor="#6b7280" />
                <stop offset="70%" stopColor="#4b5563" />
                <stop offset="100%" stopColor="#374151" />
              </linearGradient>

              {/* Background lab gradient */}
              <linearGradient id="n3lLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#030712" />
                <stop offset="50%" stopColor="#0a1628" />
                <stop offset="100%" stopColor="#030712" />
              </linearGradient>

              {/* Glow filter for balloon */}
              <filter id="n3lBalloonGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Glow filter for air particles */}
              <filter id="n3lAirParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Arrow glow filter */}
              <filter id="n3lArrowGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Arrow markers with gradients */}
              <marker id="n3lArrowBlue" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
                <path d="M0,0 L0,12 L12,6 z" fill="url(#n3lActionArrow)" />
              </marker>
              <marker id="n3lArrowOrange" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
                <path d="M0,0 L0,12 L12,6 z" fill="url(#n3lReactionArrow)" />
              </marker>
            </defs>

            {/* Premium dark lab background */}
            <rect width="700" height="280" fill="url(#n3lLabBg)" />

            {/* Subtle grid pattern */}
            <pattern id="n3lLabGrid" width="25" height="25" patternUnits="userSpaceOnUse">
              <rect width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
            <rect width="700" height="280" fill="url(#n3lLabGrid)" />

            {/* Premium track/rail */}
            <rect x="40" y="125" width="640" height="8" rx="4" fill="url(#n3lTrackGrad)" />
            <rect x="40" y="125" width="640" height="2" fill="#9ca3af" opacity="0.3" />

            {/* Distance markers with premium styling */}
            {[0, 100, 200, 300, 400, 500, 600].map(d => (
              <g key={d}>
                <line x1={50 + d} y1="140" x2={50 + d} y2="155" stroke="#4b5563" strokeWidth="2" />
                <rect x={40 + d} y="160" width="20" height="16" rx="3" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
                <text x={50 + d} y="172" textAnchor="middle" fill="#9ca3af" fontSize="9" fontWeight="bold">{d}</text>
              </g>
            ))}
            <text x="350" y="195" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="bold">DISTANCE (cm)</text>

            {/* Air particles with premium glow */}
            {airParticles.map(p => (
              <g key={p.id} filter="url(#n3lAirParticleGlow)">
                <circle cx={p.x} cy={p.y} r={2 + (p.life / 30) * 4} fill="url(#n3lAirGlow)" opacity={p.life / 30} />
              </g>
            ))}

            {/* Balloon assembly */}
            <g transform={`translate(${balloonX}, 100)`} filter={isLaunched && airRemaining > 0 ? "url(#n3lBalloonGlow)" : ""}>
              {/* Main balloon body with 3D gradient */}
              <ellipse cx={displaySize / 2} cy="0" rx={displaySize} ry={displaySize * 0.8} fill="url(#n3lBalloonGrad)" />
              {/* Highlight for 3D effect */}
              <ellipse cx={displaySize / 2} cy="0" rx={displaySize} ry={displaySize * 0.8} fill="url(#n3lBalloonHighlight)" />
              {/* Balloon nozzle/tie */}
              <path d={`M0,${displaySize * 0.15} Q-8,${displaySize * 0.3} -12,${displaySize * 0.5} L-12,${-displaySize * 0.5} Q-8,${-displaySize * 0.3} 0,${-displaySize * 0.15}`} fill="url(#n3lNozzleGrad)" />
              {/* Nozzle opening */}
              <ellipse cx="-12" cy="0" rx="3" ry={displaySize * 0.25} fill="#7f1d1d" />

              {/* Force arrows when launched */}
              {isLaunched && airRemaining > 0 && (
                <>
                  {/* Action force arrow (air escaping left) */}
                  <g transform="translate(-20, 0)" filter="url(#n3lArrowGlow)">
                    <line x1="0" y1="0" x2={-35 - forceMagnitude} y2="0" stroke="url(#n3lActionArrow)" strokeWidth="5" strokeLinecap="round" markerEnd="url(#n3lArrowBlue)" />
                  </g>
                  {/* Action force label */}
                  <g transform="translate(-45, -35)">
                    <rect x="-35" y="-12" width="70" height="22" rx="4" fill="#0c4a6e" stroke="#22d3ee" strokeWidth="1" />
                    <text x="0" y="4" textAnchor="middle" fill="#67e8f9" fontSize="10" fontWeight="bold">ACTION</text>
                  </g>
                  <text x="-45" y="25" textAnchor="middle" fill="#22d3ee" fontSize="9" fontWeight="bold">F = {forceMagnitude}N</text>

                  {/* Reaction force arrow (balloon moving right) */}
                  <g transform={`translate(${displaySize + 15}, 0)`} filter="url(#n3lArrowGlow)">
                    <line x1="0" y1="0" x2={35 + forceMagnitude} y2="0" stroke="url(#n3lReactionArrow)" strokeWidth="5" strokeLinecap="round" markerEnd="url(#n3lArrowOrange)" />
                  </g>
                  {/* Reaction force label */}
                  <g transform={`translate(${displaySize + 60}, -35)`}>
                    <rect x="-40" y="-12" width="80" height="22" rx="4" fill="#7c2d12" stroke="#fb923c" strokeWidth="1" />
                    <text x="0" y="4" textAnchor="middle" fill="#fdba74" fontSize="10" fontWeight="bold">REACTION</text>
                  </g>
                  <text x={displaySize + 60} y="25" textAnchor="middle" fill="#fb923c" fontSize="9" fontWeight="bold">F = {forceMagnitude}N</text>
                </>
              )}
            </g>

            {/* Newton's Third Law equation display */}
            <g transform="translate(350, 245)">
              <rect x="-120" y="-18" width="240" height="36" rx="8" fill="#1e293b" stroke="#374151" strokeWidth="1" />
              <text x="0" y="6" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="bold" fontFamily="monospace">
                F_action = -F_reaction
              </text>
            </g>
          </svg>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
          <div className="bg-slate-700/50 rounded-xl p-4">
            <label className="text-slate-300 text-sm block mb-2">Balloon Size: {balloonSize}%</label>
            <input
              type="range"
              min="20"
              max="100"
              value={balloonSize}
              onChange={(e) => setBalloonSize(Number(e.target.value))}
              disabled={isLaunched}
              className="w-full accent-red-500"
            />
            <p className="text-xs text-slate-400 mt-1">More air = More thrust!</p>
          </div>

          <div className="bg-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-slate-400 text-xs mb-1">Distance Traveled</div>
            <div className="text-2xl font-bold text-red-400">{Math.round(balloonX - 80)} cm</div>
            <div className="text-slate-500 text-xs mt-1">Air Remaining: {Math.round(airRemaining)}%</div>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => { if (!isLaunched) setIsLaunched(true); }}
            disabled={isLaunched}
            className={`px-6 py-3 rounded-xl font-semibold ${
              isLaunched
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-500 to-orange-600 text-white hover:shadow-lg hover:shadow-red-500/25'
            }`}
            style={{ zIndex: 10 }}
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
              className="px-4 py-3 rounded-xl border border-slate-600 text-slate-400 hover:bg-slate-700"
              style={{ zIndex: 10 }}
            >
              🔄 Reset
            </button>
          )}
        </div>

        <button
          onClick={() => goToPhase('review')}
          className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl"
          style={{ zIndex: 10 }}
        >
          See Results →
        </button>
      </div>
    );
  };

  const renderReview = () => {
    const wasCorrect = prediction === 'air_push';

    const reviewContent = [
      {
        title: "Newton's Third Law",
        content: `${wasCorrect ? "Excellent! You got it! " : ""}For every ACTION, there is an equal and opposite REACTION.\n\nWhen the balloon pushes air OUT (action), the air pushes the balloon FORWARD (reaction). These forces are equal in strength but opposite in direction!`,
        highlight: wasCorrect,
      },
      {
        title: "Action-Reaction Pairs",
        content: "The key insight: Action and reaction forces act on DIFFERENT objects.\n\n• The balloon pushes on the air (action)\n• The air pushes on the balloon (reaction)\n\nThey're equal in force, but because they act on different things, movement happens!",
      },
      {
        title: "Why Movement Occurs",
        content: "You might wonder: if the forces are equal, why does anything move?\n\nAnswer: The forces act on different objects! The air zooms backward (it's pushed by the balloon), and the balloon zooms forward (it's pushed by the air). Each object responds to the force on IT.",
      },
    ];

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Understanding Action & Reaction</h2>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full mb-6">
          <h3 className="text-xl font-bold text-red-400 mb-4">{reviewContent[reviewStep].title}</h3>
          <p className="text-slate-300 whitespace-pre-line leading-relaxed">{reviewContent[reviewStep].content}</p>

          {reviewContent[reviewStep].highlight && (
            <div className="mt-4 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
              <p className="text-emerald-400">✓ Great thinking! You correctly identified that the escaping air pushes the balloon forward.</p>
            </div>
          )}

          <div className="flex justify-center gap-2 mt-6">
            {reviewContent.map((_, i) => (
              <button
                key={i}
                onClick={() => setReviewStep(i)}
                className={`h-2 rounded-full transition-all ${
                  i === reviewStep ? 'w-6 bg-red-500' : 'w-2 bg-slate-600'
                }`}
                style={{ zIndex: 10 }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            if (reviewStep < reviewContent.length - 1) {
              setReviewStep(r => r + 1);
            } else {
              goToPhase('twist_predict');
            }
          }}
          className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl"
          style={{ zIndex: 10 }}
        >
          {reviewStep < reviewContent.length - 1 ? 'Continue →' : 'New Variable →'}
        </button>
      </div>
    );
  };

  const renderTwistPredict = () => {
    const predictions = [
      { id: 'small_wins', label: "The SMALLER balloon will travel farther (it's lighter!)", icon: '🎈' },
      { id: 'large_wins', label: 'The LARGER balloon will travel farther (more air!)', icon: '🎈🎈' },
      { id: 'same_distance', label: 'Both will travel the same distance', icon: '=' },
      { id: 'neither', label: "Neither will move - size doesn't matter", icon: '🤷' },
    ];

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
        <h2 className="text-2xl font-bold text-amber-400 mb-2">The Twist: Balloon Size</h2>
        <p className="text-slate-400 mb-8">If we race a small balloon against a large balloon, which travels farther?</p>

        <div className="grid gap-3 w-full max-w-xl mb-8">
          {predictions.map((pred) => (
            <button
              key={pred.id}
              onClick={() => setTwistPrediction(pred.id)}
              className={`p-5 rounded-xl text-left transition-all duration-300 flex items-center gap-4 ${
                twistPrediction === pred.id
                  ? 'bg-amber-500/20 border-2 border-amber-500'
                  : 'bg-slate-800/50 border-2 border-transparent hover:bg-slate-700/50'
              }`}
              style={{ zIndex: 10 }}
            >
              <span className="text-2xl">{pred.icon}</span>
              <span className="text-slate-200">{pred.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => { if (twistPrediction) goToPhase('twist_play'); }}
          disabled={!twistPrediction}
          className={`px-8 py-4 rounded-xl font-semibold transition-all ${
            twistPrediction
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
          style={{ zIndex: 10 }}
        >
          Test It →
        </button>
      </div>
    );
  };

  const renderTwistPlay = () => {
    const smallForce = Math.round(smallAir / 10);
    const largeForce = Math.round(largeAir / 8);

    return (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-2">Balloon Race!</h2>
      <p className="text-slate-400 mb-6">Small balloon vs Large balloon - which wins?</p>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 w-full max-w-2xl">
        <svg width="100%" height="280" viewBox="0 0 700 280">
          <defs>
            {/* Small balloon gradient (blue) with 3D depth */}
            <radialGradient id="n3lSmallBalloonGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="25%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="75%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </radialGradient>

            {/* Small balloon highlight */}
            <radialGradient id="n3lSmallHighlight" cx="30%" cy="25%" r="40%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>

            {/* Small balloon nozzle */}
            <linearGradient id="n3lSmallNozzle" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* Large balloon gradient (red) with 3D depth */}
            <radialGradient id="n3lLargeBalloonGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="25%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="75%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </radialGradient>

            {/* Large balloon highlight */}
            <radialGradient id="n3lLargeHighlight" cx="30%" cy="25%" r="40%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>

            {/* Large balloon nozzle */}
            <linearGradient id="n3lLargeNozzle" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* Track gradient */}
            <linearGradient id="n3lRaceTrack" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="30%" stopColor="#4b5563" />
              <stop offset="50%" stopColor="#6b7280" />
              <stop offset="70%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Race background */}
            <linearGradient id="n3lRaceBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0a1628" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Winner glow effect */}
            <linearGradient id="n3lWinnerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#16a34a" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.8" />
            </linearGradient>

            {/* Force arrow gradients */}
            <linearGradient id="n3lSmallForceArrow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            <linearGradient id="n3lLargeForceArrow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="n3lRaceBalloonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="n3lWinnerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrow markers */}
            <marker id="n3lSmallArrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
              <path d="M0,0 L0,10 L10,5 z" fill="url(#n3lSmallForceArrow)" />
            </marker>
            <marker id="n3lLargeArrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
              <path d="M0,0 L0,10 L10,5 z" fill="url(#n3lLargeForceArrow)" />
            </marker>
          </defs>

          {/* Premium dark background */}
          <rect width="700" height="280" fill="url(#n3lRaceBg)" />

          {/* Grid pattern */}
          <pattern id="n3lRaceGrid" width="25" height="25" patternUnits="userSpaceOnUse">
            <rect width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
          <rect width="700" height="280" fill="url(#n3lRaceGrid)" />

          {/* Lane labels with premium styling */}
          <g transform="translate(25, 70)">
            <rect x="-15" y="-12" width="50" height="24" rx="4" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1" />
            <text x="10" y="5" textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="bold">SMALL</text>
          </g>
          <g transform="translate(25, 170)">
            <rect x="-15" y="-12" width="50" height="24" rx="4" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1" />
            <text x="10" y="5" textAnchor="middle" fill="#fca5a5" fontSize="11" fontWeight="bold">LARGE</text>
          </g>

          {/* Race tracks */}
          <rect x="50" y="65" width="630" height="10" rx="5" fill="url(#n3lRaceTrack)" />
          <rect x="50" y="65" width="630" height="2" fill="#9ca3af" opacity="0.2" />
          <rect x="50" y="165" width="630" height="10" rx="5" fill="url(#n3lRaceTrack)" />
          <rect x="50" y="165" width="630" height="2" fill="#9ca3af" opacity="0.2" />

          {/* Distance markers */}
          {[0, 100, 200, 300, 400, 500, 600].map(d => (
            <g key={d}>
              <line x1={50 + d} y1="200" x2={50 + d} y2="215" stroke="#4b5563" strokeWidth="2" />
              <rect x={40 + d} y="220" width="20" height="16" rx="3" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
              <text x={50 + d} y="232" textAnchor="middle" fill="#9ca3af" fontSize="9" fontWeight="bold">{d}</text>
            </g>
          ))}
          <text x="350" y="258" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="bold">DISTANCE (cm)</text>

          {/* Small balloon with premium styling */}
          <g transform={`translate(${smallBalloonX}, 70)`} filter={twistLaunched && smallAir > 0 ? "url(#n3lRaceBalloonGlow)" : ""}>
            <ellipse cx="10" cy="0" rx={15} ry={12} fill="url(#n3lSmallBalloonGrad)" />
            <ellipse cx="10" cy="0" rx={15} ry={12} fill="url(#n3lSmallHighlight)" />
            <path d="M0,4 Q-4,7 -8,10 L-8,-10 Q-4,-7 0,-4" fill="url(#n3lSmallNozzle)" />
            <ellipse cx="-8" cy="0" rx="2" ry="4" fill="#1e40af" />
            {/* Force arrow for small balloon */}
            {twistLaunched && smallAir > 0 && (
              <g transform="translate(30, 0)">
                <line x1="0" y1="0" x2={15 + smallForce} y2="0" stroke="url(#n3lSmallForceArrow)" strokeWidth="3" strokeLinecap="round" markerEnd="url(#n3lSmallArrow)" />
                <text x={20 + smallForce/2} y="-8" textAnchor="middle" fill="#60a5fa" fontSize="8" fontWeight="bold">{smallForce}N</text>
              </g>
            )}
          </g>

          {/* Large balloon with premium styling */}
          <g transform={`translate(${largeBalloonX}, 170)`} filter={twistLaunched && largeAir > 0 ? "url(#n3lRaceBalloonGlow)" : ""}>
            <ellipse cx="15" cy="0" rx={25} ry={20} fill="url(#n3lLargeBalloonGrad)" />
            <ellipse cx="15" cy="0" rx={25} ry={20} fill="url(#n3lLargeHighlight)" />
            <path d="M0,6 Q-6,10 -12,16 L-12,-16 Q-6,-10 0,-6" fill="url(#n3lLargeNozzle)" />
            <ellipse cx="-12" cy="0" rx="3" ry="6" fill="#991b1b" />
            {/* Force arrow for large balloon */}
            {twistLaunched && largeAir > 0 && (
              <g transform="translate(45, 0)">
                <line x1="0" y1="0" x2={20 + largeForce} y2="0" stroke="url(#n3lLargeForceArrow)" strokeWidth="4" strokeLinecap="round" markerEnd="url(#n3lLargeArrow)" />
                <text x={25 + largeForce/2} y="-10" textAnchor="middle" fill="#f87171" fontSize="9" fontWeight="bold">{largeForce}N</text>
              </g>
            )}
          </g>

          {/* Winner announcement with premium styling */}
          {(smallAir <= 0 && largeAir <= 0) && (
            <g filter="url(#n3lWinnerGlow)">
              <line x1={Math.max(smallBalloonX, largeBalloonX) + 60} y1="40" x2={Math.max(smallBalloonX, largeBalloonX) + 60} y2="195" stroke="url(#n3lWinnerGrad)" strokeWidth="4" strokeDasharray="12 6" />
              <g transform={`translate(${Math.max(smallBalloonX, largeBalloonX) + 60}, 25)`}>
                <rect x="-50" y="-15" width="100" height="30" rx="8" fill="#14532d" stroke="#22c55e" strokeWidth="2" />
                <text x="0" y="6" textAnchor="middle" fill="#4ade80" fontSize="13" fontWeight="bold">
                  {largeBalloonX > smallBalloonX ? 'LARGE WINS!' : 'SMALL WINS!'}
                </text>
              </g>
            </g>
          )}

          {/* Physics insight box */}
          <g transform="translate(580, 120)">
            <rect x="-60" y="-35" width="120" height="70" rx="8" fill="#1e293b" stroke="#374151" strokeWidth="1" opacity="0.9" />
            <text x="0" y="-18" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="bold">MORE AIR =</text>
            <text x="0" y="-4" textAnchor="middle" fill="#e2e8f0" fontSize="8">Longer Thrust</text>
            <text x="0" y="10" textAnchor="middle" fill="#e2e8f0" fontSize="8">More Impulse</text>
            <text x="0" y="24" textAnchor="middle" fill="#e2e8f0" fontSize="8">Greater Distance</text>
          </g>
        </svg>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mb-6">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
          <div className="text-blue-400 font-semibold">Small Balloon</div>
          <div className="text-xl font-bold text-white">{Math.round(smallBalloonX - 80)} cm</div>
          <div className="text-slate-400 text-xs">Air: {Math.round(smallAir)}%</div>
        </div>

        <div className="flex justify-center items-center">
          <button
            onClick={() => { if (!twistLaunched) setTwistLaunched(true); }}
            disabled={twistLaunched}
            className={`px-6 py-3 rounded-xl font-semibold ${
              twistLaunched
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25'
            }`}
            style={{ zIndex: 10 }}
          >
            {twistLaunched ? '🏁 Racing!' : '🚀 Start Race!'}
          </button>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
          <div className="text-red-400 font-semibold">Large Balloon</div>
          <div className="text-xl font-bold text-white">{Math.round(largeBalloonX - 80)} cm</div>
          <div className="text-slate-400 text-xs">Air: {Math.round(largeAir)}%</div>
        </div>
      </div>

      {smallAir <= 0 && largeAir <= 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6 text-center">
          <p className="text-emerald-400 font-semibold">
            🏆 The large balloon won! It traveled {Math.round(largeBalloonX - smallBalloonX)} cm farther because it had more air to push out!
          </p>
        </div>
      )}

      <button
        onClick={() => goToPhase('twist_review')}
        className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl"
        style={{ zIndex: 10 }}
      >
        Understand Results →
      </button>
    </div>
  );
  };

  const renderTwistReview = () => {
    const wasCorrect = twistPrediction === 'large_wins';

    const twistReviewContent = [
      {
        title: "More Air = More Thrust Time",
        content: `${wasCorrect ? "You predicted correctly! " : ""}The larger balloon travels farther because it has more air to push out. This means it can provide thrust for LONGER.\n\nRemember: It's not just about force - it's about how LONG that force acts!`,
        highlight: wasCorrect,
      },
      {
        title: "Impulse: Force × Time",
        content: "In physics, we call this IMPULSE = Force × Time.\n\nBoth balloons push with similar force, but the larger balloon pushes for longer because it has more air. More impulse = more speed = more distance!",
      },
      {
        title: "Real Rockets Use This Principle",
        content: "This is exactly why real rockets carry so much fuel! More fuel means:\n\n• Longer burn time\n• More total impulse\n• Higher final speed\n• Greater distance traveled\n\nThe Space Shuttle carried 2 million pounds of fuel!",
      },
    ];

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-amber-400 mb-6">Size Analysis</h2>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full mb-6">
          <h3 className="text-xl font-bold text-amber-400 mb-4">{twistReviewContent[twistReviewStep].title}</h3>
          <p className="text-slate-300 whitespace-pre-line leading-relaxed">{twistReviewContent[twistReviewStep].content}</p>

          {twistReviewContent[twistReviewStep].highlight && (
            <div className="mt-4 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
              <p className="text-emerald-400">✓ Excellent reasoning! You understood that more air means longer thrust and greater distance.</p>
            </div>
          )}

          <div className="flex justify-center gap-2 mt-6">
            {twistReviewContent.map((_, i) => (
              <button
                key={i}
                onClick={() => setTwistReviewStep(i)}
                className={`h-2 rounded-full transition-all ${
                  i === twistReviewStep ? 'w-6 bg-amber-500' : 'w-2 bg-slate-600'
                }`}
                style={{ zIndex: 10 }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            if (twistReviewStep < twistReviewContent.length - 1) {
              setTwistReviewStep(t => t + 1);
            } else {
              goToPhase('transfer');
            }
          }}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl"
          style={{ zIndex: 10 }}
        >
          {twistReviewStep < twistReviewContent.length - 1 ? 'Continue →' : 'Real-World Examples →'}
        </button>
      </div>
    );
  };

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-2">Newton's Third Law Everywhere</h2>
      <p className="text-slate-400 mb-6">Explore all {applications.length} applications to unlock the quiz</p>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {applications.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveApp(index)}
            className={`px-4 py-2 rounded-full font-medium transition-all ${
              activeApp === index
                ? 'bg-red-600 text-white'
                : completedApps.has(index)
                  ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            style={{ zIndex: 10 }}
          >
            {completedApps.has(index) && '✓ '}{app.icon}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{applications[activeApp].icon}</span>
          <h3 className="text-xl font-bold text-white">{applications[activeApp].title}</h3>
        </div>

        <p className="text-slate-300 mb-4 leading-relaxed">{applications[activeApp].description}</p>

        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
          <p className="text-red-400 font-medium mb-1">💡 Fun Fact:</p>
          <p className="text-slate-300 text-sm">{applications[activeApp].fact}</p>
        </div>

        {!completedApps.has(activeApp) ? (
          <button
            onClick={() => {
              const newCompleted = new Set(completedApps);
              newCompleted.add(activeApp);
              setCompletedApps(newCompleted);
            }}
            className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl"
            style={{ zIndex: 10 }}
          >
            ✓ Mark as Read
          </button>
        ) : activeApp < applications.length - 1 ? (
          <button
            onClick={() => setActiveApp(activeApp + 1)}
            className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl"
            style={{ zIndex: 10 }}
          >
            Next Application →
          </button>
        ) : null}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">
          {applications.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />
          ))}
        </div>
        <span className="text-slate-400">{completedApps.size}/{applications.length}</span>
      </div>

      {completedApps.size === applications.length && (
        <button
          onClick={() => goToPhase('test')}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl"
          style={{ zIndex: 10 }}
        >
          Take the Quiz →
        </button>
      )}
    </div>
  );

  const renderTest = () => {
    const question = testQuestions[currentQuestion];

    if (testComplete) {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      const passed = percentage >= 70;

      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
          <div className="text-6xl mb-6">{passed ? '🎉' : '📚'}</div>
          <h2 className="text-3xl font-bold text-white mb-4">{passed ? 'Excellent Work!' : 'Keep Learning!'}</h2>
          <div className={`text-5xl font-bold mb-4 ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>
            {testScore}/{testQuestions.length}
          </div>
          <p className="text-slate-400 mb-8">{passed ? "You've mastered Newton's Third Law!" : 'Review the material and try again.'}</p>

          <button
            onClick={() => {
              if (passed) {
                goToPhase('mastery');
              } else {
                setTestComplete(false);
                setCurrentQuestion(0);
                setTestScore(0);
                goToPhase('review');
              }
            }}
            className={`px-8 py-4 font-semibold rounded-xl ${
              passed
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                : 'bg-gradient-to-r from-red-500 to-orange-600 text-white'
            }`}
            style={{ zIndex: 10 }}
          >
            {passed ? 'Continue to Mastery →' : 'Review Material'}
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center p-6">
        <div className="flex justify-between items-center w-full max-w-2xl mb-6">
          <span className="text-slate-400">Question {currentQuestion + 1} of {testQuestions.length}</span>
          <span className="text-emerald-400 font-semibold">Score: {testScore}</span>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full mb-6">
          <h3 className="text-lg font-bold text-white mb-6">{question.question}</h3>

          <div className="grid gap-3">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = option.correct;
              const showResult = showExplanation;

              let className = 'p-4 rounded-xl text-left transition-all border-2 ';
              if (showResult) {
                if (isCorrect) {
                  className += 'bg-emerald-500/20 border-emerald-500';
                } else if (isSelected && !isCorrect) {
                  className += 'bg-red-500/20 border-red-500';
                } else {
                  className += 'bg-slate-700/50 border-transparent';
                }
              } else if (isSelected) {
                className += 'bg-red-500/20 border-red-500';
              } else {
                className += 'bg-slate-700/50 border-transparent hover:bg-slate-600/50';
              }

              return (
                <button
                  key={index}
                  onClick={() => { if (!showExplanation) setSelectedAnswer(index); }}
                  className={className}
                  style={{ zIndex: 10 }}
                >
                  <span className="text-slate-200">{option.text}</span>
                  {showResult && isCorrect && <span className="ml-2">✓</span>}
                  {showResult && isSelected && !isCorrect && <span className="ml-2">✗</span>}
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div className={`mt-6 p-4 rounded-xl ${testQuestions[currentQuestion].options[selectedAnswer!]?.correct ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              <p className={`font-semibold mb-2 ${testQuestions[currentQuestion].options[selectedAnswer!]?.correct ? 'text-emerald-400' : 'text-red-400'}`}>
                {testQuestions[currentQuestion].options[selectedAnswer!]?.correct ? '✓ Correct!' : '✗ Not quite'}
              </p>
              <p className="text-slate-300">{question.explanation}</p>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            if (showExplanation) {
              if (currentQuestion < testQuestions.length - 1) {
                setCurrentQuestion(c => c + 1);
                setSelectedAnswer(null);
                setShowExplanation(false);
              } else {
                setTestComplete(true);
              }
            } else {
              if (testQuestions[currentQuestion].options[selectedAnswer!]?.correct) {
                setTestScore(s => s + 1);
              }
              setShowExplanation(true);
            }
          }}
          disabled={selectedAnswer === null && !showExplanation}
          className={`px-8 py-4 rounded-xl font-semibold transition-all ${
            selectedAnswer === null && !showExplanation
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-red-500 to-orange-600 text-white hover:shadow-lg hover:shadow-red-500/25'
          }`}
          style={{ zIndex: 10 }}
        >
          {showExplanation ? (currentQuestion < testQuestions.length - 1 ? 'Next Question →' : 'See Results →') : 'Check Answer'}
        </button>
      </div>
    );
  };

  const renderMastery = () => {
    const percentage = Math.round((testScore / testQuestions.length) * 100);

    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] p-6 text-center relative overflow-hidden">
        {/* Confetti */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-sm animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-20px',
              backgroundColor: ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'][i % 5],
              animation: `fall 3s ease-out ${Math.random() * 2}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes fall {
            0% { transform: translateY(0) rotate(0); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>

        <div className="w-28 h-28 rounded-full bg-gradient-to-r from-red-500 to-orange-600 flex items-center justify-center mb-8 shadow-2xl shadow-red-500/30">
          <span className="text-6xl">🏆</span>
        </div>

        <h1 className="text-4xl font-bold text-white mb-4">Action-Reaction Master!</h1>
        <p className="text-xl text-slate-400 mb-8">
          Final Score: <span className="text-emerald-400 font-bold">{testScore}/{testQuestions.length}</span> ({percentage}%)
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-md w-full mb-8">
          {[
            { icon: '↔️', label: 'Equal & Opposite' },
            { icon: '🎈', label: 'Air Pushes Balloon' },
            { icon: '🚀', label: 'Rockets in Space' },
            { icon: '🏊', label: 'Swimming & Walking' },
          ].map((item, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-sm text-slate-400">{item.label}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => goToPhase('hook')}
          className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25"
          style={{ zIndex: 10 }}
        >
          Explore Again ↺
        </button>
      </div>
    );
  };

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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Newton's Third Law</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-red-500 w-6 shadow-lg shadow-red-500/30'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
                style={{ zIndex: 10 }}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-red-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
}
