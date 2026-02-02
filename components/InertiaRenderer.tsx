'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// INERTIA RENDERER - Premium 10-Phase Learning Experience
// ============================================================================
// Teaches Newton's First Law: Objects at rest stay at rest, objects in motion
// stay in motion, unless acted upon by an external force.
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Lab',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Lab',
  twist_review: 'Twist Review',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery'
};

interface GameEvent {
  type: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface InertiaRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onComplete?: () => void;
  onPhaseComplete?: (phase: string) => void;
}

// Real-World Applications Data
const realWorldApps = [
  {
    icon: "🚗",
    title: "Vehicle Crash Safety",
    short: "Automotive",
    tagline: "Engineering survival through Newton's First Law",
    description: "Modern vehicle safety systems are fundamentally designed around inertia. During a collision, a car stops abruptly, but passengers continue moving at the original speed due to their inertia. Engineers design crumple zones, airbags, and restraint systems specifically to manage this kinetic energy transfer and extend the deceleration time, reducing the forces experienced by occupants.",
    connection: "Just as we observed objects resisting changes to their motion in our experiment, vehicle occupants experience the same resistance during sudden stops. The heavier the passenger, the more inertia they have, and the greater the force needed to stop them safely—exactly what we learned about mass and inertia.",
    howItWorks: "When a vehicle collides with an obstacle, the front crumple zones absorb energy by deforming progressively, extending the stopping time from milliseconds to hundreds of milliseconds. Simultaneously, pretensioners fire to remove seatbelt slack, and airbags deploy to distribute deceleration forces across a larger body area. The rigid passenger cell maintains survival space while energy-absorbing materials in the steering column, dashboard, and door panels further cushion occupants as their inertia carries them forward.",
    stats: [
      { val: "45%", label: "Reduction in fatal injuries with seatbelts" },
      { val: "30%", label: "Additional protection from front airbags" },
      { val: "300ms", label: "Extended deceleration time with crumple zones" }
    ],
    examples: [
      "Multi-stage frontal airbags that adjust inflation based on crash severity",
      "Side curtain airbags protecting heads during rollover accidents",
      "Active hood systems that raise to cushion pedestrian impacts",
      "Pretensioning seatbelts that retract microseconds before impact"
    ],
    companies: ["Volvo", "Mercedes-Benz", "Tesla", "Autoliv", "ZF Friedrichshafen"],
    futureImpact: "Next-generation vehicles will feature predictive safety systems using AI and sensor fusion to detect imminent collisions and pre-position occupants optimally. External airbags on vehicle exteriors will protect pedestrians and cyclists. Autonomous vehicles may redesign cabin layouts entirely since occupants won't need to face forward, requiring new approaches to managing inertial forces during emergency maneuvers.",
    color: "#ef4444"
  },
  {
    icon: "🚀",
    title: "Spacecraft Maneuvers",
    short: "Aerospace",
    tagline: "Harnessing eternal motion in the cosmic void",
    description: "In the vacuum of space, Newton's First Law manifests in its purest form. With no air resistance or friction, spacecraft continue at constant velocity indefinitely without propulsion. Mission planners exploit this by calculating precise trajectory burns, then allowing inertia to carry probes across billions of kilometers. The challenge becomes not maintaining motion, but changing it—every maneuver requires fuel.",
    connection: "Our experiment showed objects in motion tend to stay in motion unless acted upon by an external force. In space, this principle becomes absolute—Voyager 1 has been coasting on its 1977 launch momentum for nearly 50 years, demonstrating the ultimate example of inertia at work.",
    howItWorks: "Spacecraft maneuvers rely on carefully calculated thruster burns. A Hohmann transfer orbit uses two engine burns—one to raise the orbit and another to circularize it—with inertia carrying the craft between burns. Gravity assists use planetary flybys to 'steal' momentum from planets, effectively getting free velocity changes. Attitude control uses reaction wheels that spin up to rotate the spacecraft in the opposite direction, all based on conservation of angular momentum and Newton's Laws.",
    stats: [
      { val: "17 km/s", label: "Voyager 1 speed from 1977 launch inertia" },
      { val: "99.9%", label: "Of mission time spent coasting on inertia" },
      { val: "10+ years", label: "Some missions coast to outer planets" }
    ],
    examples: [
      "Voyager probes traveling beyond the solar system on launch inertia",
      "Mars mission trajectory burns followed by months of coasting",
      "Gravity slingshot maneuvers around Jupiter for outer planet missions",
      "International Space Station orbital adjustments and reboosts"
    ],
    companies: ["NASA", "SpaceX", "ESA", "Blue Origin", "Rocket Lab"],
    futureImpact: "Ion propulsion systems will enable continuous low-thrust acceleration, allowing spacecraft to reach higher velocities than chemical rockets by running for months or years. Solar sails will harness photon pressure for propellantless propulsion. Future interstellar missions may use laser-pushed light sails to achieve a fraction of light speed, then coast to nearby stars over decades—the ultimate expression of inertia-based travel.",
    color: "#6366f1"
  },
  {
    icon: "🏃",
    title: "Sports Equipment Design",
    short: "Athletics",
    tagline: "Optimizing performance through mass distribution",
    description: "Athletic equipment designers meticulously engineer inertia to enhance performance. Baseball bats balance swing speed against hitting mass, golf clubs optimize moment of inertia for forgiveness on off-center hits, and running shoes minimize foot inertia for faster leg turnover. Understanding how mass affects motion initiation and stopping is fundamental to every piece of sports equipment.",
    connection: "Just as we discovered that heavy objects are harder to accelerate, athletes experience this directly—a heavier bat is harder to swing but transfers more momentum on contact. The sweet spot exists where mass and acceleration balance for maximum power.",
    howItWorks: "Sports equipment designers manipulate mass distribution to control rotational and linear inertia. A tennis racquet's moment of inertia (MOI) determines how it resists twisting on off-center hits—higher MOI means more stability but slower maneuverability. Golf club heads place mass around the perimeter to increase forgiveness, making the club more resistant to rotation on mishits. Running shoe designers minimize heel and toe mass to reduce the energy required to accelerate and decelerate the foot through each stride cycle.",
    stats: [
      { val: "30%", label: "Energy reduction from lighter running shoes" },
      { val: "5000+", label: "MOI (g·cm²) in game-improvement golf drivers" },
      { val: "2x", label: "Ball speed increase from optimal bat mass" }
    ],
    examples: [
      "Carbon fiber tennis racquets with optimized swing weight",
      "Perimeter-weighted golf clubheads for maximum forgiveness",
      "Carbon-plated running shoes minimizing foot inertia",
      "Weighted baseball training bats for strength development"
    ],
    companies: ["Wilson", "Callaway", "Nike", "Titleist", "Babolat"],
    futureImpact: "3D-printed equipment with precisely customized mass distribution will match individual athlete biomechanics. Smart materials that can dynamically shift mass during a swing or stride will optimize inertia in real-time. AI-designed geometries will find non-intuitive mass distributions that maximize performance while minimizing injury risk, revolutionizing equipment for every sport.",
    color: "#22c55e"
  },
  {
    icon: "🤖",
    title: "Industrial Robotics",
    short: "Manufacturing",
    tagline: "Precision motion through inertia management",
    description: "Industrial robots must precisely control inertia to achieve accuracy and speed. Each joint must accelerate and decelerate arm segments, and the inertia at the end effector changes dramatically based on payload and arm configuration. Advanced control systems continuously calculate inertial loads and compensate motor torques accordingly, enabling robots to paint cars, weld steel, and assemble electronics with submillimeter precision.",
    connection: "Our experiment demonstrated how mass affects acceleration—robots face this challenge constantly. A robot arm carrying a heavy payload has more inertia and requires more torque to stop precisely. If not compensated, the arm would overshoot its target position.",
    howItWorks: "Robot motion controllers use dynamic models that calculate the instantaneous inertia tensor of the arm based on joint positions and payload. This information feeds forward into the motor control loop, adjusting torque commands to compensate for inertial effects. Harmonic drives and cycloidal gearboxes provide high gear ratios to amplify motor torque against arm inertia. Force-torque sensors at the wrist detect unexpected loads, while vibration damping algorithms prevent resonance when the arm's natural frequency matches commanded motions.",
    stats: [
      { val: "0.02mm", label: "Repeatability of modern industrial robots" },
      { val: "500kg", label: "Payload capacity of heavy-duty robots" },
      { val: "2m/s²", label: "Typical joint acceleration with full load" }
    ],
    examples: [
      "Automotive welding robots compensating for gun weight variations",
      "Pick-and-place systems adjusting for varying product masses",
      "Painting robots maintaining constant speed despite arm extension",
      "Collaborative robots sensing and adapting to human interactions"
    ],
    companies: ["FANUC", "ABB", "KUKA", "Yaskawa", "Universal Robots"],
    futureImpact: "Soft robotics with variable-stiffness actuators will dynamically change arm inertia for safer human collaboration. AI-based motion planning will learn optimal trajectories that minimize energy while accounting for complex inertial interactions. Swarm robotics will coordinate multiple lightweight arms to handle heavy payloads collectively, distributing inertial loads across the system and enabling unprecedented flexibility in manufacturing.",
    color: "#f59e0b"
  }
];

// Test Questions
const testQuestions = [
  {
    scenario: "A grocery store clerk is trying to push two shopping carts across the store. One cart is empty, while the other is fully loaded with heavy items like water bottles and canned goods.",
    question: "Why does the fully loaded cart require more effort to start moving and stop?",
    options: [
      { text: "The loaded cart has more friction with the floor", correct: false },
      { text: "The loaded cart has more mass, giving it greater inertia to resist changes in motion", correct: true },
      { text: "The wheels on the loaded cart are smaller", correct: false },
      { text: "Gravity pulls harder on the loaded cart sideways", correct: false }
    ],
    explanation: "Inertia is directly proportional to mass. The loaded cart has more mass, so it has greater resistance to changes in its state of motion. This means more force is needed to accelerate it from rest and more force is needed to bring it to a stop."
  },
  {
    scenario: "During a football game, a 250-pound linebacker tries to tackle a 220-pound running back who is sprinting at full speed. The running back manages to break through the tackle attempt.",
    question: "How does inertia explain why a moving player is harder to stop than a stationary one?",
    options: [
      { text: "Moving players generate a force field", correct: false },
      { text: "The running back's motion gives him momentum, and his inertia resists the change the tackle tries to impose", correct: true },
      { text: "Players weigh less when moving", correct: false },
      { text: "The tackle creates more friction", correct: false }
    ],
    explanation: "An object in motion tends to stay in motion due to inertia. The running back's body resists the change in motion that the tackle attempts to create. Combined with his momentum (mass times velocity), his inertia makes him harder to stop than if he were standing still."
  },
  {
    scenario: "A magician performs the classic tablecloth trick, yanking a tablecloth from under dishes, glasses, and silverware without disturbing them. The audience gasps as everything remains in place.",
    question: "What principle of physics allows the dishes to stay in place when the cloth is pulled quickly?",
    options: [
      { text: "The dishes stick to the table with static electricity", correct: false },
      { text: "The friction is too low to move the dishes", correct: false },
      { text: "The dishes' inertia keeps them at rest while the quick pull minimizes friction transfer time", correct: true },
      { text: "Air pressure holds the dishes down", correct: false }
    ],
    explanation: "The dishes have inertia - the tendency to remain at rest. When the tablecloth is pulled quickly, friction acts for such a short time that it cannot overcome the dishes' inertia. If pulled slowly, friction would have time to transfer motion to the dishes, causing them to move."
  },
  {
    scenario: "An astronaut on the International Space Station pushes off a wall to float across the cabin to another module. Once moving, she continues gliding without any additional effort.",
    question: "Why does the astronaut continue moving without pushing again?",
    options: [
      { text: "The space station's rotation propels her forward", correct: false },
      { text: "In the microgravity environment with no friction, her inertia keeps her moving at constant velocity", correct: true },
      { text: "Air currents from the ventilation system push her along", correct: false },
      { text: "Magnetic forces in space pull her forward", correct: false }
    ],
    explanation: "Newton's First Law states that an object in motion stays in motion unless acted upon by an external force. In the space station, there's no significant friction or air resistance to slow the astronaut down, so her inertia keeps her moving at a constant velocity until she grabs something to stop."
  },
  {
    scenario: "A driver in a car suddenly slams on the brakes to avoid hitting a deer. The coffee cup on the dashboard flies forward and spills all over the windshield.",
    question: "What caused the coffee cup to fly forward when the car stopped?",
    options: [
      { text: "The brakes pushed the cup forward", correct: false },
      { text: "The cup's inertia caused it to continue moving forward while the car decelerated", correct: true },
      { text: "The windshield created suction pulling the cup", correct: false },
      { text: "Gravity shifted due to the car's sudden stop", correct: false }
    ],
    explanation: "The coffee cup was moving forward with the car. When the brakes were applied, the car slowed down but the cup, due to its inertia, continued moving forward at its original speed. From inside the car, it appears the cup flew forward, but actually the car slowed while the cup maintained its motion."
  },
  {
    scenario: "A figure skater spins on the ice and then brings her arms close to her body. Even though she's not pushing with her skates, her spinning speed increases dramatically.",
    question: "Although this involves rotational motion, how does inertia relate to objects maintaining their state of motion?",
    options: [
      { text: "Her skates generate more power when arms are tucked", correct: false },
      { text: "Objects naturally tend to maintain their motion; without external torque, the skater's angular momentum is conserved", correct: true },
      { text: "The ice creates less friction when she tucks in", correct: false },
      { text: "Her body weight shifts to make her spin faster", correct: false }
    ],
    explanation: "Newton's First Law applies to rotational motion too - a spinning object tends to keep spinning. When the skater pulls in her arms, she's reducing her rotational inertia (moment of inertia), and to conserve angular momentum, her rotation speed must increase. No external force started or stopped her spin."
  },
  {
    scenario: "A delivery truck driver is transporting a large refrigerator that isn't strapped down. When the driver turns sharply to the left, the refrigerator slides to the right side of the truck bed.",
    question: "Why did the refrigerator move to the right when the truck turned left?",
    options: [
      { text: "The truck pushed the refrigerator to the right", correct: false },
      { text: "Centrifugal force threw it outward", correct: false },
      { text: "The refrigerator's inertia kept it moving in a straight line while the truck turned beneath it", correct: true },
      { text: "The truck bed tilted to the right", correct: false }
    ],
    explanation: "The refrigerator was moving forward in a straight line with the truck. When the truck turned left, the refrigerator's inertia kept it moving in its original straight path. From the truck driver's perspective, the refrigerator appeared to slide right, but it was actually the truck that moved left while the refrigerator continued straight."
  },
  {
    scenario: "A bowling ball and a tennis ball are both placed on a smooth table. A child tries to flick each ball with the same finger force. The tennis ball shoots across the table while the bowling ball barely moves.",
    question: "Why did the same force produce such different results for the two balls?",
    options: [
      { text: "The tennis ball has less friction with the table", correct: false },
      { text: "The bowling ball has much more mass and therefore more inertia, resisting the change in motion more than the lighter tennis ball", correct: true },
      { text: "The tennis ball is more aerodynamic", correct: false },
      { text: "The bowling ball absorbed the force internally", correct: false }
    ],
    explanation: "Inertia is proportional to mass. The bowling ball has much greater mass than the tennis ball, so it has much greater inertia. The same force applied to both produces less acceleration in the more massive object because F = ma; with greater mass, acceleration decreases for the same force."
  },
  {
    scenario: "During a train ride, a passenger is standing in the aisle. When the train starts moving forward, the passenger stumbles backward. When the train stops, the passenger lurches forward.",
    question: "What principle explains the passenger's movements in both situations?",
    options: [
      { text: "The train's vibrations push the passenger around", correct: false },
      { text: "Air currents in the train car move the passenger", correct: false },
      { text: "The passenger's inertia causes their body to resist changes in motion - staying still when the train starts and staying in motion when it stops", correct: true },
      { text: "The passenger's shoes have poor grip on the floor", correct: false }
    ],
    explanation: "When the train accelerates forward, the passenger's body, due to inertia, tends to stay at rest, making them feel pushed backward relative to the train. When the train decelerates, the passenger's body tends to stay in motion at the previous speed, making them feel pushed forward. Both are manifestations of Newton's First Law."
  },
  {
    scenario: "NASA's Voyager 1 spacecraft, launched in 1977, is now over 15 billion miles from Earth and still traveling at about 38,000 mph despite not having used its engines for decades.",
    question: "How can Voyager 1 keep traveling without any propulsion?",
    options: [
      { text: "Solar wind continues to push it outward", correct: false },
      { text: "In the vacuum of space with virtually no external forces, its inertia keeps it moving at a constant velocity indefinitely", correct: true },
      { text: "Gravity from distant stars pulls it forward", correct: false },
      { text: "Its nuclear power source provides continuous thrust", correct: false }
    ],
    explanation: "Newton's First Law perfectly applies in space. Once Voyager was set in motion, it continues moving because there are virtually no external forces to slow it down - no air resistance, no friction. Its inertia keeps it traveling at constant velocity. The spacecraft will continue moving through space essentially forever unless it encounters something."
  }
];

export default function InertiaRenderer({ onGameEvent, gamePhase, onComplete, onPhaseComplete }: InertiaRendererProps) {
  // Core State
  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);

  // Hook phase
  const [hookStep, setHookStep] = useState(0);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);

  // Play phase - Objects with different masses
  const [selectedMass, setSelectedMass] = useState<'light' | 'heavy'>('light');
  const [hasAppliedForce, setHasAppliedForce] = useState(false);
  const [objectPosition, setObjectPosition] = useState(50);
  const [isMoving, setIsMoving] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict - Seatbelts scenario
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - Car/passenger simulation
  const [carSpeed, setCarSpeed] = useState(0);
  const [carPosition, setCarPosition] = useState(50);
  const [passengerPosition, setPassengerPosition] = useState(0);
  const [hasCrashed, setHasCrashed] = useState(false);
  const [seatbeltOn, setSeatbeltOn] = useState(false);
  const [showCrashResult, setShowCrashResult] = useState(false);
  const carAnimationRef = useRef<number | null>(null);

  // Twist review
  const [twistReviewStep, setTwistReviewStep] = useState(0);

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Test phase
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

  // Premium Design System
  const colors = {
    primary: '#f59e0b',       // amber-500
    primaryDark: '#d97706',   // amber-600
    accent: '#6366f1',        // indigo-500
    secondary: '#22c55e',     // green-500
    success: '#10b981',       // emerald-500
    danger: '#ef4444',        // red-500
    warning: '#f59e0b',       // amber-500
    bgDark: '#0a0f1a',        // custom dark
    bgCard: '#0f172a',        // slate-900
    bgCardLight: '#1e293b',   // slate-800
    textPrimary: '#f8fafc',   // slate-50
    textSecondary: '#94a3b8', // slate-400
    textMuted: '#64748b',     // slate-500
    border: '#334155',        // slate-700
    borderLight: '#475569',   // slate-600
  };

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
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
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
  const emitEvent = useCallback((type: string, details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      type,
      gameType: 'inertia',
      gameTitle: 'Inertia',
      details: { phase, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase]);

  // Navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    setPhase(newPhase);
    playSound('transition');
    emitEvent('phase_change', { from: phase, to: newPhase });
    onPhaseComplete?.(phase);

    // Reset state for play phases
    if (newPhase === 'play') {
      setObjectPosition(50);
      setHasAppliedForce(false);
      setIsMoving(false);
    }
    if (newPhase === 'twist_play') {
      setCarSpeed(0);
      setCarPosition(50);
      setPassengerPosition(0);
      setHasCrashed(false);
      setShowCrashResult(false);
    }
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  // Apply force animation for play phase
  const applyForce = useCallback(() => {
    if (hasAppliedForce) return;
    setHasAppliedForce(true);
    setIsMoving(true);
    playSound('click');

    const acceleration = selectedMass === 'light' ? 2 : 0.5;
    let position = 50;
    let velocity = 0;

    const animate = () => {
      velocity += acceleration;
      position += velocity;
      setObjectPosition(position);

      if (position < 350) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsMoving(false);
        playSound('success');
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [hasAppliedForce, selectedMass, playSound]);

  // Car crash simulation
  const startDriving = useCallback(() => {
    if (carSpeed > 0) return;
    setCarSpeed(60);
    playSound('click');

    let pos = 50;
    const animate = () => {
      pos += 3;
      setCarPosition(pos);

      if (pos >= 250) {
        // Crash!
        setHasCrashed(true);
        setCarSpeed(0);

        if (!seatbeltOn) {
          // Passenger continues moving due to inertia
          let passengerPos = 0;
          const passengerAnimate = () => {
            passengerPos += 8;
            setPassengerPosition(passengerPos);
            if (passengerPos < 60) {
              requestAnimationFrame(passengerAnimate);
            } else {
              playSound('failure');
              setShowCrashResult(true);
            }
          };
          requestAnimationFrame(passengerAnimate);
        } else {
          playSound('success');
          setShowCrashResult(true);
        }
        return;
      }

      carAnimationRef.current = requestAnimationFrame(animate);
    };

    carAnimationRef.current = requestAnimationFrame(animate);
  }, [carSpeed, seatbeltOn, playSound]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (carAnimationRef.current) cancelAnimationFrame(carAnimationRef.current);
    };
  }, []);

  // Handle test answer
  const handleTestAnswer = useCallback((answerIndex: number) => {
    if (showExplanation) return;

    setSelectedAnswer(answerIndex);
    setShowExplanation(true);

    if (testQuestions[currentQuestion].options[answerIndex]?.correct) {
      setTestScore(s => s + 1);
      playSound('success');
    } else {
      playSound('failure');
    }
  }, [currentQuestion, showExplanation, playSound]);

  // Progress bar renderer
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const progress = ((currentIndex + 1) / phaseOrder.length) * 100;

    return (
      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`
          }}
        />
      </div>
    );
  };

  // Navigation dots renderer
  const renderNavDots = () => (
    <div className="flex items-center gap-1.5">
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{ zIndex: 10 }}
          className={`h-2 rounded-full transition-all duration-300 ${
            phase === p
              ? 'bg-amber-400 w-6 shadow-lg shadow-amber-400/30'
              : phaseOrder.indexOf(phase) > i
                ? 'bg-emerald-500 w-2'
                : 'bg-slate-700 w-2 hover:bg-slate-600'
          }`}
          title={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // ==================== PHASE RENDERERS ====================

  const renderHook = () => {
    const hookContent = [
      {
        title: "Newton's First Law of Motion",
        content: "Have you ever wondered why you lurch forward when a car suddenly stops? Or why it's harder to push a heavy shopping cart than an empty one?",
        visual: "\u2696\uFE0F",
      },
      {
        title: "Objects Resist Change",
        content: "Isaac Newton discovered something amazing: Objects 'want' to keep doing what they're doing. If they're still, they want to stay still. If they're moving, they want to keep moving!",
        visual: "\uD83D\uDCA1",
      },
      {
        title: "This is Called INERTIA",
        content: "Inertia is the resistance of any object to any change in its motion. The more mass an object has, the more inertia it has - and the harder it is to change its motion.",
        visual: "\uD83C\uDFCB\uFE0F",
      },
    ];

    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
        {/* Premium badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-8">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-amber-400 tracking-wide">PHYSICS EXPLORATION</span>
        </div>

        {/* Main visual */}
        <div className="text-7xl mb-6" style={{ filter: 'drop-shadow(0 8px 24px rgba(245, 158, 11, 0.4))' }}>
          {hookContent[hookStep].visual}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: typo.title }} className="font-bold text-white mb-4">
          {hookContent[hookStep].title}
        </h1>

        {/* Content */}
        <p style={{ fontSize: typo.bodyLarge }} className="text-slate-400 max-w-md mb-8 leading-relaxed">
          {hookContent[hookStep].content}
        </p>

        {/* Step indicators */}
        <div className="flex gap-2 mb-8">
          {hookContent.map((_, i) => (
            <button
              key={i}
              onClick={() => setHookStep(i)}
              style={{ zIndex: 10 }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === hookStep ? 'w-8 bg-amber-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={() => {
            if (hookStep < hookContent.length - 1) {
              setHookStep(h => h + 1);
            } else {
              goToPhase('predict');
            }
          }}
          style={{ zIndex: 10 }}
          className="group relative px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="relative z-10 flex items-center gap-3">
            {hookStep < hookContent.length - 1 ? 'Continue' : 'Make a Prediction'}
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>

        {/* Feature hints */}
        <div className="mt-12 flex items-center gap-8 text-sm text-slate-500 flex-wrap justify-center">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">{'\u2726'}</span>
            Interactive Lab
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">{'\u2726'}</span>
            Real-World Examples
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">{'\u2726'}</span>
            Knowledge Test
          </div>
        </div>
      </div>
    );
  };

  const renderPredict = () => {
    const predictions = [
      { id: 'heavy_harder', label: 'The heavy object will be harder to move', icon: '\uD83C\uDFCB\uFE0F' },
      { id: 'same_speed', label: 'Both objects will move at the same speed', icon: '\u2194\uFE0F' },
      { id: 'light_slower', label: 'The light object will be slower', icon: '\uD83E\uDEB6' },
      { id: 'no_difference', label: 'There will be no difference', icon: '\u2753' },
    ];

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-2">Make Your Prediction</h2>
        <p style={{ fontSize: typo.body }} className="text-slate-400 mb-8">If you push a light object and a heavy object with the same force, what happens?</p>

        <div className="flex flex-col gap-3 w-full max-w-md mb-8">
          {predictions.map((pred) => (
            <button
              key={pred.id}
              onClick={() => {
                setPrediction(pred.id);
                playSound(pred.id === 'heavy_harder' ? 'success' : 'click');
                emitEvent('prediction_made', { prediction: pred.id });
              }}
              style={{ zIndex: 10 }}
              className={`p-4 rounded-xl border-2 transition-all duration-300 flex items-center gap-4 ${
                prediction === pred.id
                  ? 'border-amber-500 bg-amber-500/20'
                  : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50'
              }`}
            >
              <span className="text-2xl">{pred.icon}</span>
              <span className="text-white font-medium text-left">{pred.label}</span>
            </button>
          ))}
        </div>

        {prediction && (
          <button
            onClick={() => goToPhase('play')}
            style={{ zIndex: 10 }}
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all"
          >
            Test My Prediction {'\u2192'}
          </button>
        )}
      </div>
    );
  };

  const renderPlay = () => (
    <div className="flex flex-col items-center px-6 py-8">
      <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-2">Inertia Experiment</h2>
      <p style={{ fontSize: typo.body }} className="text-slate-400 mb-6">Apply the same force to objects with different masses and observe!</p>

      {/* Simulation */}
      <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-700/50">
        <svg width={isMobile ? 320 : 400} height={isMobile ? 160 : 200} className="mx-auto">
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="inerBgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Ground gradient */}
            <linearGradient id="inerGroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="25%" stopColor="#374151" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="75%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Light object gradient (blue sphere) */}
            <radialGradient id="inerLightObjGradient" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="25%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="75%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </radialGradient>

            {/* Heavy object gradient (orange block) */}
            <linearGradient id="inerHeavyObjGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fdba74" />
              <stop offset="25%" stopColor="#fb923c" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="75%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>

            {/* Force arrow gradient */}
            <linearGradient id="inerForceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="40%" stopColor="#4ade80" />
              <stop offset="70%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>

            {/* Motion trail gradient */}
            <linearGradient id="inerTrailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={selectedMass === 'light' ? '#3b82f6' : '#f97316'} stopOpacity="0" />
              <stop offset="50%" stopColor={selectedMass === 'light' ? '#3b82f6' : '#f97316'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={selectedMass === 'light' ? '#3b82f6' : '#f97316'} stopOpacity="0.6" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="inerObjectGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="inerForceGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="inerShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
            </filter>

            {/* Arrow marker */}
            <marker id="inerArrowForce" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">
              <path d="M0,0 L0,8 L12,4 z" fill="url(#inerForceGradient)" />
            </marker>
          </defs>

          {/* Background */}
          <rect width="100%" height="100%" fill="url(#inerBgGradient)" rx="12" />

          {/* Ground with grid pattern */}
          <rect x="0" y={isMobile ? 128 : 160} width="100%" height={isMobile ? 32 : 40} fill="url(#inerGroundGradient)" />
          <line x1="0" y1={isMobile ? 128 : 160} x2="100%" y2={isMobile ? 128 : 160} stroke="#64748b" strokeWidth="2" />
          {/* Grid lines on ground */}
          {[50, 100, 150, 200, 250, 300, 350].filter(x => x < (isMobile ? 320 : 400)).map(x => (
            <line key={x} x1={x} y1={isMobile ? 130 : 162} x2={x} y2={isMobile ? 160 : 200} stroke="#4b5563" strokeWidth="1" strokeOpacity="0.5" />
          ))}

          {/* Motion trail when moving */}
          {isMoving && (
            <rect
              x={40}
              y={selectedMass === 'light' ? (isMobile ? 96 : 120) : (isMobile ? 88 : 110)}
              width={Math.max(0, objectPosition * (isMobile ? 0.8 : 1) - 40)}
              height={selectedMass === 'light' ? (isMobile ? 32 : 40) : (isMobile ? 40 : 50)}
              fill="url(#inerTrailGradient)"
              rx="4"
            />
          )}

          {/* Object */}
          <g transform={`translate(${objectPosition * (isMobile ? 0.8 : 1)}, ${isMobile ? 80 : 100})`} filter="url(#inerShadow)">
            {selectedMass === 'light' ? (
              // Light object - 3D sphere with highlight
              <>
                <ellipse cx="20" cy={isMobile ? 46 : 58} rx={isMobile ? 14 : 18} ry={isMobile ? 3 : 4} fill="rgba(0,0,0,0.3)" />
                <circle cx="20" cy={isMobile ? 32 : 40} r={isMobile ? 16 : 20} fill="url(#inerLightObjGradient)" filter="url(#inerObjectGlow)" />
                <ellipse cx={isMobile ? 15 : 14} cy={isMobile ? 27 : 34} rx={isMobile ? 5 : 6} ry={isMobile ? 3 : 4} fill="rgba(255,255,255,0.3)" />
              </>
            ) : (
              // Heavy object - 3D block with shading
              <>
                <ellipse cx={isMobile ? 24 : 30} cy={isMobile ? 50 : 62} rx={isMobile ? 22 : 28} ry={isMobile ? 4 : 5} fill="rgba(0,0,0,0.3)" />
                <rect x="0" y={isMobile ? 8 : 10} width={isMobile ? 48 : 60} height={isMobile ? 40 : 50} fill="url(#inerHeavyObjGradient)" rx="4" filter="url(#inerObjectGlow)" />
                {/* Top highlight */}
                <rect x={isMobile ? 3 : 4} y={isMobile ? 11 : 14} width={isMobile ? 42 : 52} height={isMobile ? 6 : 8} fill="rgba(255,255,255,0.15)" rx="2" />
                {/* Side shadow */}
                <rect x={isMobile ? 42 : 52} y={isMobile ? 11 : 14} width={isMobile ? 5 : 6} height={isMobile ? 34 : 42} fill="rgba(0,0,0,0.2)" rx="2" />
              </>
            )}
          </g>

          {/* Force arrow with glow */}
          {!hasAppliedForce && (
            <g transform={`translate(${isMobile ? 16 : 20}, ${isMobile ? 96 : 120})`} filter="url(#inerForceGlow)">
              <line x1="0" y1="0" x2={isMobile ? 24 : 30} y2="0" stroke="url(#inerForceGradient)" strokeWidth="4" markerEnd="url(#inerArrowForce)" />
              {/* Pulsing force indicator */}
              <circle cx="0" cy="0" r="5" fill="#22c55e" opacity="0.6">
                <animate attributeName="r" values="5;8;5" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0.3;0.6" dur="1s" repeatCount="indefinite" />
              </circle>
            </g>
          )}

          {/* Velocity indicator when moving */}
          {isMoving && (
            <g transform={`translate(${(objectPosition * (isMobile ? 0.8 : 1)) + (selectedMass === 'light' ? (isMobile ? 36 : 45) : (isMobile ? 52 : 65))}, ${isMobile ? 96 : 120})`}>
              <line x1="0" y1="0" x2={isMobile ? 16 : 20} y2="0" stroke="#fbbf24" strokeWidth="3" strokeDasharray="4 2">
                <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="0.3s" repeatCount="indefinite" />
              </line>
            </g>
          )}
        </svg>
      </div>

      {/* Labels outside SVG using typo system */}
      <div className="text-center mb-4">
        <p style={{ fontSize: typo.body }} className="text-slate-400">
          {isMoving ? 'Accelerating...' : hasAppliedForce ? 'Stopped!' : 'Ready to push'}
        </p>
        {hasAppliedForce && !isMoving && (
          <p style={{ fontSize: typo.small }} className="text-amber-400 mt-1">
            {selectedMass === 'light' ? 'Light object: Fast acceleration!' : 'Heavy object: Slow acceleration (more inertia)!'}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="w-full max-w-sm">
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/50">
          <h4 style={{ fontSize: typo.body }} className="text-white font-medium mb-3">Select Object Mass</h4>
          <div className="flex gap-2">
            {(['light', 'heavy'] as const).map(mass => (
              <button
                key={mass}
                onClick={() => {
                  if (!hasAppliedForce) setSelectedMass(mass);
                }}
                style={{ zIndex: 10 }}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                  selectedMass === mass
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {mass === 'light' ? '\uD83D\uDFE6 Light (1kg)' : '\uD83D\uDFE7 Heavy (10kg)'}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => { if (!hasAppliedForce) applyForce(); }}
          disabled={hasAppliedForce && isMoving}
          style={{ zIndex: 10 }}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
            hasAppliedForce
              ? 'bg-slate-700 text-slate-400'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/25'
          }`}
        >
          {hasAppliedForce ? '\u2713 Force Applied!' : '\uD83D\uDC49 Apply Force!'}
        </button>

        {hasAppliedForce && !isMoving && (
          <button
            onClick={() => {
              setObjectPosition(50);
              setHasAppliedForce(false);
              setIsMoving(false);
            }}
            style={{ zIndex: 10 }}
            className="w-full mt-3 py-3 bg-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-600"
          >
            {'\uD83D\uDD04'} Try Again
          </button>
        )}

        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <p style={{ fontSize: typo.small }} className="text-amber-400">{'\uD83D\uDCA1'} Try both masses to see how inertia affects acceleration!</p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('review')}
        style={{ zIndex: 10 }}
        className="mt-6 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl"
      >
        Understand Results {'\u2192'}
      </button>
    </div>
  );

  const renderReview = () => {
    const wasCorrect = prediction === 'heavy_harder';
    const reviewContent = [
      {
        title: "What is Inertia?",
        content: `${wasCorrect ? "You predicted correctly! " : ""}Inertia is the resistance of any object to a change in its state of motion.\n\nThis includes:\n- Objects at rest resisting being moved\n- Objects in motion resisting being stopped\n- Objects resisting changes in direction`,
        highlight: wasCorrect,
      },
      {
        title: "Mass and Inertia",
        content: "The more mass an object has, the more inertia it has.\n\n- Heavy objects are harder to start moving\n- Heavy objects are harder to stop\n- Heavy objects are harder to change direction\n\nThis is why pushing a car is harder than pushing a bicycle!",
      },
      {
        title: "F = ma Explains It",
        content: "Newton's Second Law (F = ma) shows us why:\n\nFor the same Force:\n- Light object (small m) = Large acceleration\n- Heavy object (large m) = Small acceleration\n\nMore inertia means less response to the same force!",
      },
    ];

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-6">Understanding Inertia</h2>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-lg w-full border border-slate-700/50 mb-6">
          <h3 style={{ fontSize: typo.bodyLarge }} className="font-bold text-amber-400 mb-4">{reviewContent[reviewStep].title}</h3>
          <p style={{ fontSize: typo.body }} className="text-slate-300 whitespace-pre-line leading-relaxed">{reviewContent[reviewStep].content}</p>

          {reviewContent[reviewStep].highlight && (
            <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
              <p style={{ fontSize: typo.small }} className="text-emerald-400">{'\u2713'} Great prediction! You correctly understood that heavier objects are harder to move.</p>
            </div>
          )}
        </div>

        {/* Step indicators */}
        <div className="flex gap-2 mb-6">
          {reviewContent.map((_, i) => (
            <button
              key={i}
              onClick={() => setReviewStep(i)}
              style={{ zIndex: 10 }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === reviewStep ? 'w-8 bg-amber-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => {
            if (reviewStep < reviewContent.length - 1) {
              setReviewStep(r => r + 1);
            } else {
              goToPhase('twist_predict');
            }
          }}
          style={{ zIndex: 10 }}
          className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl"
        >
          {reviewStep < reviewContent.length - 1 ? 'Continue \u2192' : 'Try a New Scenario \u2192'}
        </button>
      </div>
    );
  };

  const renderTwistPredict = () => {
    const predictions = [
      { id: 'seatbelt_stops', label: 'The seatbelt will stop the passenger safely', icon: '\u2705' },
      { id: 'passenger_flies', label: 'Without seatbelt, the passenger keeps moving forward', icon: '\uD83D\uDCA8' },
      { id: 'both_stop', label: 'Both car and passenger stop at the same time', icon: '\uD83D\uDED1' },
      { id: 'nothing_happens', label: 'Nothing happens to the passenger', icon: '\u2753' },
    ];

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="text-5xl mb-4">{'\uD83D\uDE97'}</div>
        <h2 style={{ fontSize: typo.heading }} className="font-bold text-indigo-400 mb-2">The Twist: Sudden Stop</h2>
        <p style={{ fontSize: typo.body }} className="text-slate-400 mb-8 text-center max-w-md">A car is moving fast and suddenly crashes into a wall. What happens to the passenger inside?</p>

        <div className="flex flex-col gap-3 w-full max-w-md mb-8">
          {predictions.map((pred) => (
            <button
              key={pred.id}
              onClick={() => {
                setTwistPrediction(pred.id);
                playSound((pred.id === 'seatbelt_stops' || pred.id === 'passenger_flies') ? 'success' : 'click');
                emitEvent('twist_prediction_made', { twistPrediction: pred.id });
              }}
              style={{ zIndex: 10 }}
              className={`p-4 rounded-xl border-2 transition-all duration-300 flex items-center gap-4 ${
                twistPrediction === pred.id
                  ? 'border-indigo-500 bg-indigo-500/20'
                  : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50'
              }`}
            >
              <span className="text-2xl">{pred.icon}</span>
              <span className="text-white font-medium text-left">{pred.label}</span>
            </button>
          ))}
        </div>

        {twistPrediction && (
          <button
            onClick={() => goToPhase('twist_play')}
            style={{ zIndex: 10 }}
            className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
          >
            Test It {'\u2192'}
          </button>
        )}
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center px-6 py-8">
      <h2 style={{ fontSize: typo.heading }} className="font-bold text-indigo-400 mb-2">Car Crash Simulation</h2>
      <p style={{ fontSize: typo.body }} className="text-slate-400 mb-6">See how inertia affects passengers during a sudden stop!</p>

      {/* Simulation */}
      <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-700/50">
        <svg width={isMobile ? 320 : 400} height={isMobile ? 144 : 180} className="mx-auto">
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="inerTwistBgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Road gradient */}
            <linearGradient id="inerRoadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="25%" stopColor="#374151" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="75%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Wall gradient (danger) */}
            <linearGradient id="inerWallGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="25%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="75%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* Car body gradient */}
            <linearGradient id="inerCarBodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="25%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="75%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Car roof gradient */}
            <linearGradient id="inerCarRoofGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#bfdbfe" />
              <stop offset="30%" stopColor="#93c5fd" />
              <stop offset="70%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            {/* Passenger gradient (head) */}
            <radialGradient id="inerPassengerGradient" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="30%" stopColor="#fde047" />
              <stop offset="60%" stopColor="#fcd34d" />
              <stop offset="100%" stopColor="#fbbf24" />
            </radialGradient>

            {/* Seatbelt gradient */}
            <linearGradient id="inerSeatbeltGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Wheel gradient */}
            <radialGradient id="inerWheelGradient" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="40%" stopColor="#374151" />
              <stop offset="70%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </radialGradient>

            {/* Speed trail gradient */}
            <linearGradient id="inerSpeedTrailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.5" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="inerCarGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="inerWallGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="inerPassengerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="inerCarShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="3" dy="5" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Background */}
          <rect width="100%" height="100%" fill="url(#inerTwistBgGradient)" rx="12" />

          {/* Road with markings */}
          <rect x="0" y={isMobile ? 104 : 130} width="100%" height={isMobile ? 40 : 50} fill="url(#inerRoadGradient)" />
          {/* Road edge line */}
          <line x1="0" y1={isMobile ? 104 : 130} x2="100%" y2={isMobile ? 104 : 130} stroke="#64748b" strokeWidth="2" />
          {/* Center line (animated dashes) */}
          <line x1="0" y1={isMobile ? 124 : 155} x2="100%" y2={isMobile ? 124 : 155} stroke="#fbbf24" strokeWidth="3" strokeDasharray="20,15">
            {carSpeed > 0 && !hasCrashed && (
              <animate attributeName="stroke-dashoffset" from="0" to="-35" dur="0.2s" repeatCount="indefinite" />
            )}
          </line>

          {/* Speed trail when moving */}
          {carSpeed > 0 && !hasCrashed && (
            <rect x={isMobile ? 16 : 20} y={isMobile ? 84 : 105} width={Math.max(0, carPosition * (isMobile ? 0.8 : 1) - (isMobile ? 16 : 20))} height={isMobile ? 32 : 40} fill="url(#inerSpeedTrailGradient)" rx="4" />
          )}

          {/* Wall with glow */}
          <g filter={hasCrashed ? "url(#inerWallGlow)" : undefined}>
            <rect x={isMobile ? 256 : 320} y={isMobile ? 56 : 70} width={isMobile ? 16 : 20} height={isMobile ? 48 : 60} fill="url(#inerWallGradient)" rx="2" />
            {/* Wall texture lines */}
            <line x1={isMobile ? 260 : 325} y1={isMobile ? 60 : 75} x2={isMobile ? 260 : 325} y2={isMobile ? 100 : 125} stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
            <line x1={isMobile ? 264 : 330} y1={isMobile ? 60 : 75} x2={isMobile ? 264 : 330} y2={isMobile ? 100 : 125} stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
            <line x1={isMobile ? 268 : 335} y1={isMobile ? 60 : 75} x2={isMobile ? 268 : 335} y2={isMobile ? 100 : 125} stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
          </g>

          {/* Car with premium styling */}
          <g transform={`translate(${carPosition * (isMobile ? 0.8 : 1)}, ${isMobile ? 68 : 85})`} filter="url(#inerCarShadow)">
            {/* Car shadow on ground */}
            <ellipse cx={isMobile ? 28 : 35} cy={isMobile ? 48 : 60} rx={isMobile ? 26 : 32} ry={isMobile ? 4 : 5} fill="rgba(0,0,0,0.3)" />

            {/* Car body */}
            <rect x="0" y={isMobile ? 16 : 20} width={isMobile ? 56 : 70} height={isMobile ? 20 : 25} fill="url(#inerCarBodyGradient)" rx="4" filter="url(#inerCarGlow)" />
            {/* Body highlight */}
            <rect x={isMobile ? 2 : 3} y={isMobile ? 18 : 23} width={isMobile ? 51 : 64} height={isMobile ? 5 : 6} fill="rgba(255,255,255,0.15)" rx="2" />

            {/* Car roof */}
            <rect x={isMobile ? 8 : 10} y={isMobile ? 4 : 5} width={isMobile ? 32 : 40} height={isMobile ? 16 : 20} fill="url(#inerCarRoofGradient)" rx="3" />

            {/* Windows with reflections */}
            <rect x={isMobile ? 12 : 15} y={isMobile ? 6 : 8} width={isMobile ? 10 : 12} height={isMobile ? 11 : 14} fill="#1e3a5a" rx="2" />
            <rect x={isMobile ? 12 : 15} y={isMobile ? 6 : 8} width={isMobile ? 3 : 4} height={isMobile ? 11 : 14} fill="rgba(255,255,255,0.1)" rx="1" />
            <rect x={isMobile ? 26 : 33} y={isMobile ? 6 : 8} width={isMobile ? 10 : 12} height={isMobile ? 11 : 14} fill="#1e3a5a" rx="2" />
            <rect x={isMobile ? 26 : 33} y={isMobile ? 6 : 8} width={isMobile ? 3 : 4} height={isMobile ? 11 : 14} fill="rgba(255,255,255,0.1)" rx="1" />

            {/* Headlights */}
            <ellipse cx={isMobile ? 54 : 68} cy={isMobile ? 26 : 32} rx={isMobile ? 2 : 3} ry={isMobile ? 3 : 4} fill="#fef08a" />
            <ellipse cx={isMobile ? 54 : 68} cy={isMobile ? 26 : 32} rx={isMobile ? 1.5 : 2} ry={isMobile ? 1.5 : 2} fill="#fef9c3" />

            {/* Wheels with 3D gradient */}
            <circle cx={isMobile ? 12 : 15} cy={isMobile ? 38 : 47} r={isMobile ? 6 : 8} fill="url(#inerWheelGradient)" />
            <circle cx={isMobile ? 12 : 15} cy={isMobile ? 38 : 47} r={isMobile ? 3 : 4} fill="#6b7280" />
            <circle cx={isMobile ? 44 : 55} cy={isMobile ? 38 : 47} r={isMobile ? 6 : 8} fill="url(#inerWheelGradient)" />
            <circle cx={isMobile ? 44 : 55} cy={isMobile ? 38 : 47} r={isMobile ? 3 : 4} fill="#6b7280" />

            {/* Passenger */}
            <g transform={`translate(${passengerPosition * (isMobile ? 0.8 : 1)}, 0)`} filter="url(#inerPassengerGlow)">
              <circle cx={isMobile ? 30 : 38} cy={isMobile ? 12 : 15} r={isMobile ? 6 : 7} fill="url(#inerPassengerGradient)" />
              {/* Face features */}
              <circle cx={isMobile ? 29 : 36} cy={isMobile ? 10 : 13} r={isMobile ? 0.8 : 1} fill="#374151" />
              <circle cx={isMobile ? 32 : 40} cy={isMobile ? 10 : 13} r={isMobile ? 0.8 : 1} fill="#374151" />
              {/* Seatbelt with gradient */}
              {seatbeltOn && !hasCrashed && (
                <line x1={isMobile ? 24 : 30} y1={isMobile ? 8 : 10} x2={isMobile ? 36 : 45} y2={isMobile ? 20 : 25} stroke="url(#inerSeatbeltGradient)" strokeWidth="3" strokeLinecap="round" />
              )}
            </g>

            {/* Impact effect when crashed */}
            {hasCrashed && (
              <>
                <circle cx={isMobile ? 56 : 70} cy={isMobile ? 24 : 30} r={isMobile ? 6 : 8} fill="none" stroke="#fbbf24" strokeWidth="2" opacity="0.7">
                  <animate attributeName="r" values={isMobile ? "6;16;6" : "8;20;8"} dur="0.5s" repeatCount="3" />
                  <animate attributeName="opacity" values="0.7;0;0.7" dur="0.5s" repeatCount="3" />
                </circle>
              </>
            )}
          </g>
        </svg>
      </div>

      {/* Labels outside SVG using typo system */}
      <div className="flex justify-between w-full max-w-sm mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
          <span style={{ fontSize: typo.small }} className="text-slate-400">
            Speed: <span className="text-white font-semibold">{carSpeed} mph</span>
          </span>
        </div>
        <div className={`px-3 py-1 rounded-full text-white font-semibold ${seatbeltOn ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}
             style={{ fontSize: typo.label }}>
          {seatbeltOn ? 'BELT ON' : 'NO BELT'}
        </div>
      </div>

      {/* Result message */}
      {showCrashResult && (
        <div className={`mb-4 px-4 py-2 rounded-xl ${seatbeltOn ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
          <p style={{ fontSize: typo.body }} className={`font-semibold ${seatbeltOn ? 'text-emerald-400' : 'text-red-400'}`}>
            {seatbeltOn ? '\u2713 SAFE! Seatbelt stopped passenger!' : '\u26A0 DANGER! Passenger kept moving!'}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="w-full max-w-sm">
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/50">
          <h4 style={{ fontSize: typo.body }} className="text-white font-medium mb-3">Seatbelt</h4>
          <div className="flex gap-2">
            <button
              onClick={() => { if (!hasCrashed) setSeatbeltOn(true); }}
              style={{ zIndex: 10 }}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                seatbeltOn
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {'\u2705'} Belt On
            </button>
            <button
              onClick={() => { if (!hasCrashed) setSeatbeltOn(false); }}
              style={{ zIndex: 10 }}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                !seatbeltOn
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {'\u274C'} No Belt
            </button>
          </div>
        </div>

        <button
          onClick={() => { if (!hasCrashed) startDriving(); }}
          disabled={hasCrashed}
          style={{ zIndex: 10 }}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
            hasCrashed
              ? 'bg-slate-700 text-slate-400'
              : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg hover:shadow-indigo-500/25'
          }`}
        >
          {hasCrashed ? '\u2713 Crashed!' : '\uD83D\uDE97 Start Driving'}
        </button>

        {showCrashResult && (
          <button
            onClick={() => {
              setCarSpeed(0);
              setCarPosition(50);
              setPassengerPosition(0);
              setHasCrashed(false);
              setShowCrashResult(false);
            }}
            style={{ zIndex: 10 }}
            className="w-full mt-3 py-3 bg-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-600"
          >
            {'\uD83D\uDD04'} Try Again
          </button>
        )}

        <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
          <p style={{ fontSize: typo.small }} className="text-indigo-400">{'\uD83D\uDCA1'} Try with and without seatbelt to see the difference!</p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        style={{ zIndex: 10 }}
        className="mt-6 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl"
      >
        Understand Results {'\u2192'}
      </button>
    </div>
  );

  const renderTwistReview = () => {
    const twistReviewContent = [
      {
        title: "Why Seatbelts Save Lives",
        content: "When a car suddenly stops (crash), the car's motion stops immediately. But YOUR body has inertia - it 'wants' to keep moving forward at the same speed!\n\nWithout a seatbelt, you continue forward and hit the dashboard, steering wheel, or windshield.",
      },
      {
        title: "The Seatbelt's Job",
        content: "A seatbelt provides the EXTERNAL FORCE needed to stop your body's motion.\n\nNewton's First Law: An object in motion stays in motion UNLESS acted upon by an external force.\n\nThe seatbelt is that external force - it stops your inertia safely!",
      },
      {
        title: "The Numbers Are Clear",
        content: "At 30 mph, an unbelted passenger hits the dashboard with the same force as falling from a 3-story building!\n\nSeatbelts:\n- Reduce fatal injuries by 45%\n- Reduce serious injuries by 50%\n- Have saved over 300,000 lives since 1975",
      },
    ];

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <h2 style={{ fontSize: typo.heading }} className="font-bold text-indigo-400 mb-6">The Physics of Safety</h2>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-lg w-full border border-slate-700/50 mb-6">
          <h3 style={{ fontSize: typo.bodyLarge }} className="font-bold text-indigo-400 mb-4">{twistReviewContent[twistReviewStep].title}</h3>
          <p style={{ fontSize: typo.body }} className="text-slate-300 whitespace-pre-line leading-relaxed">{twistReviewContent[twistReviewStep].content}</p>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2 mb-6">
          {twistReviewContent.map((_, i) => (
            <button
              key={i}
              onClick={() => setTwistReviewStep(i)}
              style={{ zIndex: 10 }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === twistReviewStep ? 'w-8 bg-indigo-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => {
            if (twistReviewStep < twistReviewContent.length - 1) {
              setTwistReviewStep(t => t + 1);
            } else {
              goToPhase('transfer');
            }
          }}
          style={{ zIndex: 10 }}
          className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl"
        >
          {twistReviewStep < twistReviewContent.length - 1 ? 'Continue \u2192' : 'Real-World Examples \u2192'}
        </button>
      </div>
    );
  };

  const renderTransfer = () => {
    const app = realWorldApps[activeApp];
    const allAppsCompleted = completedApps.size >= realWorldApps.length;

    return (
      <div className="flex flex-col items-center px-4 py-8">
        <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-2">Inertia in the Real World</h2>
        <p style={{ fontSize: typo.small }} className="text-slate-400 mb-6 text-center">
          Explore all {realWorldApps.length} applications to unlock the quiz
        </p>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          {realWorldApps.map((a, index) => (
            <button
              key={index}
              onClick={() => {
                setActiveApp(index);
                setExpandedSection(null);
              }}
              style={{ zIndex: 10 }}
              className={`px-4 py-2 rounded-full font-medium text-sm transition-all flex items-center gap-2 ${
                activeApp === index
                  ? 'text-white shadow-lg'
                  : completedApps.has(index)
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              {...(activeApp === index ? { style: { zIndex: 10, background: `linear-gradient(135deg, ${a.color}, ${a.color}dd)` } } : {})}
            >
              {completedApps.has(index) && '\u2713 '}{a.icon}
              {!isMobile && <span>{a.short}</span>}
            </button>
          ))}
        </div>

        {/* Application Content */}
        <div
          className="rounded-2xl p-6 max-w-2xl w-full border mb-6"
          style={{
            background: `linear-gradient(135deg, ${app.color}15, ${app.color}05)`,
            borderColor: `${app.color}40`
          }}
        >
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: `linear-gradient(135deg, ${app.color}30, ${app.color}10)` }}
            >
              {app.icon}
            </div>
            <div className="flex-1">
              <h3 style={{ fontSize: typo.bodyLarge }} className="font-bold text-white">{app.title}</h3>
              <p style={{ fontSize: typo.small }} className="text-slate-400">{app.tagline}</p>
            </div>
          </div>

          {/* Description */}
          <p style={{ fontSize: typo.body }} className="text-slate-300 leading-relaxed mb-6">{app.description}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {app.stats.map((stat, i) => (
              <div
                key={i}
                className="rounded-xl p-3 text-center"
                style={{ background: `${app.color}15` }}
              >
                <div style={{ fontSize: typo.bodyLarge, color: app.color }} className="font-bold">{stat.val}</div>
                <div style={{ fontSize: typo.label }} className="text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Expandable Sections */}
          <div className="space-y-3">
            {/* Connection to Experiment */}
            <button
              onClick={() => setExpandedSection(expandedSection === 'connection' ? null : 'connection')}
              style={{ zIndex: 10 }}
              className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-left transition-all hover:bg-slate-700/50"
            >
              <div className="flex items-center justify-between">
                <span style={{ fontSize: typo.body }} className="text-white font-medium">Connection to Our Experiment</span>
                <span className={`transition-transform ${expandedSection === 'connection' ? 'rotate-180' : ''}`}>{'\u25BC'}</span>
              </div>
              {expandedSection === 'connection' && (
                <p style={{ fontSize: typo.small }} className="text-slate-400 mt-3 leading-relaxed">{app.connection}</p>
              )}
            </button>

            {/* How It Works */}
            <button
              onClick={() => setExpandedSection(expandedSection === 'howItWorks' ? null : 'howItWorks')}
              style={{ zIndex: 10 }}
              className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-left transition-all hover:bg-slate-700/50"
            >
              <div className="flex items-center justify-between">
                <span style={{ fontSize: typo.body }} className="text-white font-medium">How It Works</span>
                <span className={`transition-transform ${expandedSection === 'howItWorks' ? 'rotate-180' : ''}`}>{'\u25BC'}</span>
              </div>
              {expandedSection === 'howItWorks' && (
                <p style={{ fontSize: typo.small }} className="text-slate-400 mt-3 leading-relaxed">{app.howItWorks}</p>
              )}
            </button>

            {/* Examples */}
            <button
              onClick={() => setExpandedSection(expandedSection === 'examples' ? null : 'examples')}
              style={{ zIndex: 10 }}
              className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-left transition-all hover:bg-slate-700/50"
            >
              <div className="flex items-center justify-between">
                <span style={{ fontSize: typo.body }} className="text-white font-medium">Real Examples</span>
                <span className={`transition-transform ${expandedSection === 'examples' ? 'rotate-180' : ''}`}>{'\u25BC'}</span>
              </div>
              {expandedSection === 'examples' && (
                <ul className="mt-3 space-y-2">
                  {app.examples.map((ex, i) => (
                    <li key={i} style={{ fontSize: typo.small }} className="text-slate-400 flex items-start gap-2">
                      <span style={{ color: app.color }}>{'\u2022'}</span>
                      {ex}
                    </li>
                  ))}
                </ul>
              )}
            </button>

            {/* Future Impact */}
            <button
              onClick={() => setExpandedSection(expandedSection === 'future' ? null : 'future')}
              style={{ zIndex: 10 }}
              className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-left transition-all hover:bg-slate-700/50"
            >
              <div className="flex items-center justify-between">
                <span style={{ fontSize: typo.body }} className="text-white font-medium">Future Impact</span>
                <span className={`transition-transform ${expandedSection === 'future' ? 'rotate-180' : ''}`}>{'\u25BC'}</span>
              </div>
              {expandedSection === 'future' && (
                <p style={{ fontSize: typo.small }} className="text-slate-400 mt-3 leading-relaxed">{app.futureImpact}</p>
              )}
            </button>
          </div>

          {/* Companies */}
          <div className="mt-6 pt-4 border-t border-slate-700/50">
            <p style={{ fontSize: typo.label }} className="text-slate-500 mb-2">Leading Companies</p>
            <div className="flex flex-wrap gap-2">
              {app.companies.map((company, i) => (
                <span
                  key={i}
                  style={{ fontSize: typo.label }}
                  className="px-3 py-1 rounded-full bg-slate-800/50 text-slate-400"
                >
                  {company}
                </span>
              ))}
            </div>
          </div>

          {/* Mark as complete button */}
          {!completedApps.has(activeApp) && (
            <button
              onClick={() => {
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
                playSound('complete');
                emitEvent('app_explored', { app: app.title });
                if (activeApp < realWorldApps.length - 1) {
                  setTimeout(() => {
                    setActiveApp(activeApp + 1);
                    setExpandedSection(null);
                  }, 300);
                }
              }}
              style={{ zIndex: 10, background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)` }}
              className="w-full mt-6 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              {'\u2713'} Mark as Complete
            </button>
          )}

          {completedApps.has(activeApp) && (
            <div className="mt-6 py-3 bg-emerald-500/10 rounded-xl text-center border border-emerald-500/30">
              <span style={{ fontSize: typo.body }} className="text-emerald-400 font-medium">{'\u2713'} Completed</span>
            </div>
          )}
        </div>

        <p style={{ fontSize: typo.small }} className="text-slate-500 mb-4">
          {completedApps.size} of {realWorldApps.length} applications explored
        </p>

        {allAppsCompleted ? (
          <button
            onClick={() => goToPhase('test')}
            style={{ zIndex: 10 }}
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            Take the Quiz {'\u2192'}
          </button>
        ) : (
          <span style={{ fontSize: typo.small }} className="text-slate-500">Explore {realWorldApps.length - completedApps.size} more to continue</span>
        )}
      </div>
    );
  };

  const renderTest = () => {
    const question = testQuestions[currentQuestion];

    if (testComplete) {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      const passed = percentage >= 70;

      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] px-6 py-8 text-center">
          <div className="text-7xl mb-6">{passed ? '\uD83C\uDF89' : '\uD83D\uDCDA'}</div>

          <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-4">
            {passed ? 'Excellent Work!' : 'Keep Learning!'}
          </h2>

          <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mb-4">
            {testScore}/{testQuestions.length}
          </div>

          <p style={{ fontSize: typo.bodyLarge }} className="text-slate-400 mb-8">
            {passed ? 'You have mastered the Law of Inertia!' : 'Review the material and try again.'}
          </p>

          <button
            onClick={() => {
              if (passed) {
                goToPhase('mastery');
              } else {
                setTestComplete(false);
                setCurrentQuestion(0);
                setTestScore(0);
                setSelectedAnswer(null);
                setShowExplanation(false);
                goToPhase('review');
              }
            }}
            style={{ zIndex: 10 }}
            className={`px-8 py-4 font-semibold rounded-xl ${
              passed
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
            }`}
          >
            {passed ? 'Continue to Mastery \u2192' : 'Review Material'}
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="flex justify-between items-center w-full max-w-lg mb-4">
          <span style={{ fontSize: typo.small }} className="text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
            Question {currentQuestion + 1} of {testQuestions.length}
          </span>
          <span style={{ fontSize: typo.small }} className="font-bold text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full">
            Score: {testScore}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-lg h-1 bg-slate-700 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / testQuestions.length) * 100}%` }}
          />
        </div>

        {/* Scenario */}
        <div className="bg-slate-800/30 rounded-xl p-4 max-w-lg w-full mb-4 border border-slate-700/50">
          <p style={{ fontSize: typo.small }} className="text-slate-400 leading-relaxed">{question.scenario}</p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-lg w-full border border-slate-700/50 mb-6">
          <h3 style={{ fontSize: typo.body }} className="text-white font-semibold mb-4 leading-relaxed">{question.question}</h3>

          <div className="flex flex-col gap-3">
            {question.options.map((option, index) => {
              let bgClass = 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50';
              let textClass = 'text-white';

              if (showExplanation) {
                if (option.correct) {
                  bgClass = 'bg-emerald-500/20 border-emerald-500';
                  textClass = 'text-emerald-400';
                } else if (index === selectedAnswer) {
                  bgClass = 'bg-red-500/20 border-red-500';
                  textClass = 'text-red-400';
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => handleTestAnswer(index)}
                  disabled={showExplanation}
                  style={{ zIndex: 10 }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${bgClass}`}
                >
                  <span style={{ fontSize: typo.small }} className={textClass}>{option.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {showExplanation && (
          <div className={`p-4 rounded-xl max-w-lg w-full mb-6 ${
            testQuestions[currentQuestion].options[selectedAnswer!]?.correct
              ? 'bg-emerald-500/10 border border-emerald-500/30'
              : 'bg-red-500/10 border border-red-500/30'
          }`}>
            <p style={{ fontSize: typo.body }} className={`font-semibold mb-2 ${
              testQuestions[currentQuestion].options[selectedAnswer!]?.correct ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {testQuestions[currentQuestion].options[selectedAnswer!]?.correct ? '\u2713 Correct!' : '\u2717 Not quite'}
            </p>
            <p style={{ fontSize: typo.small }} className="text-slate-300">{question.explanation}</p>
          </div>
        )}

        {showExplanation && (
          <button
            onClick={() => {
              if (currentQuestion < testQuestions.length - 1) {
                setCurrentQuestion(c => c + 1);
                setSelectedAnswer(null);
                setShowExplanation(false);
              } else {
                setTestComplete(true);
              }
            }}
            style={{ zIndex: 10 }}
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl"
          >
            {currentQuestion < testQuestions.length - 1 ? 'Next Question \u2192' : 'See Results \u2192'}
          </button>
        )}
      </div>
    );
  };

  const renderMastery = () => {
    const percentage = Math.round((testScore / testQuestions.length) * 100);

    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center relative overflow-hidden">
        {/* Confetti effect */}
        <style>{`
          @keyframes confetti {
            0% { transform: translateY(0) rotate(0); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: '-20px',
              width: '10px',
              height: '10px',
              background: ['#f59e0b', '#6366f1', '#22c55e', '#10b981'][i % 4],
              borderRadius: '2px',
              animation: `confetti 3s ease-out ${Math.random() * 2}s infinite`,
            }}
          />
        ))}

        {/* Trophy */}
        <div className="w-32 h-32 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center mb-8 shadow-lg shadow-amber-500/30">
          <span className="text-6xl">{'\uD83C\uDFC6'}</span>
        </div>

        <h1 style={{ fontSize: typo.title }} className="font-bold text-white mb-2">Congratulations!</h1>
        <h2 style={{ fontSize: typo.heading }} className="text-amber-400 mb-4">Inertia Master</h2>

        <p style={{ fontSize: typo.bodyLarge }} className="text-slate-400 mb-8">
          Final Score: <span className="text-emerald-400 font-bold">{testScore}/{testQuestions.length}</span> ({percentage}%)
        </p>

        {/* Key concepts */}
        <div className="grid grid-cols-2 gap-4 max-w-md w-full mb-8">
          {[
            { icon: '\u2696\uFE0F', label: 'Objects Resist Change' },
            { icon: '\uD83C\uDFCB\uFE0F', label: 'More Mass = More Inertia' },
            { icon: '\uD83D\uDE97', label: 'Seatbelts Save Lives' },
            { icon: '\uD83D\uDE80', label: 'Motion Continues Forever' },
          ].map((item, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-3xl mb-2">{item.icon}</div>
              <div style={{ fontSize: typo.small }} className="text-slate-400">{item.label}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: typo.small }} className="text-slate-500 mb-6 max-w-md">
          You now understand Newton's First Law of Motion - the Law of Inertia. Objects at rest stay at rest, and objects in motion stay in motion, unless acted upon by an external force!
        </p>

        <button
          onClick={() => {
            // Reset all state for replay
            setPhase('hook');
            setHookStep(0);
            setPrediction(null);
            setSelectedMass('light');
            setHasAppliedForce(false);
            setObjectPosition(50);
            setIsMoving(false);
            setReviewStep(0);
            setTwistPrediction(null);
            setCarSpeed(0);
            setCarPosition(50);
            setPassengerPosition(0);
            setHasCrashed(false);
            setSeatbeltOn(false);
            setShowCrashResult(false);
            setTwistReviewStep(0);
            setActiveApp(0);
            setCompletedApps(new Set());
            setExpandedSection(null);
            setCurrentQuestion(0);
            setSelectedAnswer(null);
            setShowExplanation(false);
            setTestScore(0);
            setTestComplete(false);
            onComplete?.();
          }}
          style={{ zIndex: 10 }}
          className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl"
        >
          Complete Lesson {'\u2713'}
        </button>
      </div>
    );
  };

  // ==================== MAIN RENDER ====================
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 max-w-4xl mx-auto">
          <span style={{ fontSize: typo.small }} className="font-semibold text-white/80 tracking-wide">Inertia</span>
          {renderNavDots()}
          <span style={{ fontSize: typo.small }} className="font-medium text-amber-400">{phaseLabels[phase]}</span>
        </div>
        {renderProgressBar()}
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
}
