'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
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
  play: 'Experiment',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Experiment',
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
      { text: "The cup's inertia kept it moving forward at its original speed while the car decelerated beneath it", correct: true },
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
      { text: "Solar wind propels it further into deep space", correct: false },
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
  const [appliedForce, setAppliedForce] = useState(10);

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

  // Test phase
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(new Array(testQuestions.length).fill(null));
  const [confirmedQuestions, setConfirmedQuestions] = useState<Set<number>>(new Set());
  const [testScore, setTestScore] = useState(0);
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Responsive detection
  const { isMobile } = useViewport();
// Responsive typography
  const typo = {
    h1: isMobile ? '26px' : '36px',
    h2: isMobile ? '20px' : '24px',
    h3: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '11px' : '13px',
  };

  // Design System
  const colors = {
    primary: '#f59e0b',
    primaryDark: '#d97706',
    accent: '#6366f1',
    secondary: '#22c55e',
    success: '#10b981',
    danger: '#ef4444',
    bgDark: '#0a0f1a',
    bgCard: '#0f172a',
    bgCardLight: '#1e293b',
    textPrimary: '#f8fafc',
    textSecondary: 'rgba(148,163,184,0.8)',
    textMuted: 'rgba(100,116,139,0.7)',
    border: '#334155',
    borderLight: '#475569',
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    playSound('transition');
    emitEvent('phase_change', { from: phase, to: newPhase });
    onPhaseComplete?.(phase);

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

  const currentPhaseIndex = phaseOrder.indexOf(phase);
  const canGoBack = currentPhaseIndex > 0;
  const canGoNext = currentPhaseIndex < phaseOrder.length - 1 && phase !== 'test';

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
        setHasCrashed(true);
        setCarSpeed(0);

        if (!seatbeltOn) {
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

  // Mastery effect
  useEffect(() => {
    if (phase === 'mastery') {
      emitEvent('mastery_achieved', { score: testScore, total: testQuestions.length });
    }
  }, [phase, testScore, emitEvent]);

  // Shared styles
  const cardStyle: React.CSSProperties = {
    background: colors.bgCard,
    borderRadius: isMobile ? '12px' : '16px',
    padding: isMobile ? '16px' : '24px',
    border: `1px solid ${colors.border}`,
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  };

  const primaryBtnStyle: React.CSSProperties = {
    padding: '14px 32px',
    borderRadius: '12px',
    border: 'none',
    background: `linear-gradient(135deg, ${colors.primary}, #ea580c)`,
    color: 'white',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '16px',
    transition: 'all 0.3s ease',
    zIndex: 10,
    position: 'relative' as const,
    boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
  };

  // Progress bar
  const renderProgressBar = () => {
    const progress = ((currentPhaseIndex + 1) / phaseOrder.length) * 100;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', background: colors.bgCardLight, zIndex: 100 }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
          borderRadius: '0 2px 2px 0',
          transition: 'width 0.5s ease',
        }} />
      </div>
    );
  };

  // Navigation dots
  const renderNavDots = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          title={phaseLabels[p]}
          aria-label={phaseLabels[p]}
          style={{
            height: '8px',
            width: phase === p ? '24px' : '8px',
            borderRadius: '9999px',
            border: 'none',
            cursor: 'pointer',
            background: phase === p ? colors.primary : currentPhaseIndex > i ? colors.success : colors.bgCardLight,
            boxShadow: phase === p ? `0 0 12px ${colors.primary}40` : 'none',
            transition: 'all 0.3s ease',
            zIndex: 10,
            position: 'relative' as const,
          }}
        />
      ))}
    </div>
  );

  // Bottom navigation bar
  const renderBottomBar = () => (
    <div style={{
      padding: '16px 24px',
      background: colors.bgCard,
      borderTop: `1px solid ${colors.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <button
        onClick={() => canGoBack && goToPhase(phaseOrder[currentPhaseIndex - 1])}
        disabled={!canGoBack}
        style={{
          padding: '10px 24px',
          borderRadius: '10px',
          border: `1px solid ${colors.border}`,
          background: 'transparent',
          color: canGoBack ? colors.textPrimary : colors.textMuted,
          cursor: canGoBack ? 'pointer' : 'default',
          fontWeight: 600,
          fontSize: '14px',
          transition: 'all 0.2s ease',
          opacity: canGoBack ? 1 : 0.4,
        }}
      >
        Back
      </button>
      {renderNavDots()}
      <button
        onClick={() => canGoNext && goToPhase(phaseOrder[currentPhaseIndex + 1])}
        disabled={!canGoNext || phase === 'test'}
        style={{
          padding: '10px 24px',
          borderRadius: '10px',
          border: 'none',
          background: canGoNext && phase !== 'test' ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` : colors.bgCardLight,
          color: canGoNext && phase !== 'test' ? 'white' : colors.textMuted,
          cursor: canGoNext && phase !== 'test' ? 'pointer' : 'default',
          fontWeight: 600,
          fontSize: '14px',
          transition: 'all 0.2s ease',
          opacity: canGoNext && phase !== 'test' ? 1 : 0.4,
        }}
      >
        Next
      </button>
    </div>
  );

  // ==================== PHASE RENDERERS ====================

  const renderHook = () => {
    const hookContent = [
      {
        title: "Newton's First Law of Motion",
        content: "Have you ever wondered why you lurch forward when a car suddenly stops? Or why it's harder to push a heavy shopping cart than an empty one?",
      },
      {
        title: "Objects Resist Change",
        content: "Isaac Newton discovered something amazing: Objects 'want' to keep doing what they're doing. If they're still, they want to stay still. If they're moving, they want to keep moving!",
      },
      {
        title: "This is Called INERTIA",
        content: "Inertia is the resistance of any object to any change in its motion. The more mass an object has, the more inertia it has - and the harder it is to change its motion.",
      },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: isMobile ? '400px' : '500px', padding: isMobile ? '24px 16px' : '48px 24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: `${colors.primary}15`, border: `1px solid ${colors.primary}30`, borderRadius: '9999px', marginBottom: isMobile ? '20px' : '32px' }}>
          <span style={{ width: '8px', height: '8px', background: colors.primary, borderRadius: '9999px' }} />
          <span style={{ fontSize: typo.label, fontWeight: 600, color: colors.primary, letterSpacing: '0.05em' }}>PHYSICS EXPLORATION</span>
        </div>

        <h1 style={{ fontSize: typo.h1, fontWeight: 800, color: '#ffffff', marginBottom: '16px', lineHeight: 1.1 }}>
          {hookContent[hookStep].title}
        </h1>

        <p style={{ fontSize: typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: isMobile ? '20px' : '32px', lineHeight: 1.7 }}>
          {hookContent[hookStep].content}
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          {hookContent.map((_, i) => (
            <button
              key={i}
              onClick={() => setHookStep(i)}
              style={{
                height: '8px',
                width: i === hookStep ? '32px' : '8px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                background: i === hookStep ? colors.primary : colors.bgCardLight,
                transition: 'all 0.3s ease',
                zIndex: 10,
                position: 'relative' as const,
              }}
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
          style={primaryBtnStyle}
        >
          {hookStep < hookContent.length - 1 ? 'Continue' : 'Make Your Prediction'}
        </button>
      </div>
    );
  };

  const renderPredict = () => {
    const predictions = [
      { id: 'heavy_harder', label: 'The heavy object will be harder to move', icon: '🏋️' },
      { id: 'same_speed', label: 'Both objects will move at the same speed', icon: '↔️' },
      { id: 'light_slower', label: 'The light object will be slower', icon: '🪶' },
      { id: 'no_difference', label: 'There will be no difference', icon: '❓' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '20px 16px' : '32px 24px' }}>
        <h2 style={{ fontSize: typo.h2, fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>Make Your Prediction</h2>
        <p style={{ fontSize: typo.body, color: colors.textSecondary, marginBottom: '20px', textAlign: 'center' }}>
          If you push a light object and a heavy object with the same force, what happens?
        </p>

        {/* SVG visualization for predict phase */}
        <div style={{ marginBottom: '20px', width: '100%', maxWidth: '420px' }}>
          <svg width="100%" viewBox="0 0 360 180" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Inertia visualization">
            <defs>
              <linearGradient id="predBg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <radialGradient id="predLightObj" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </radialGradient>
              <linearGradient id="predHeavyObj" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fdba74" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#c2410c" />
              </linearGradient>
              <linearGradient id="predArrow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
              <filter id="predGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="predShadow">
                <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
              </filter>
            </defs>
            <rect width="360" height="180" fill="url(#predBg)" rx="12" />
            <g>
              <rect x="0" y="140" width="360" height="40" fill="#334155" />
              <line x1="0" y1="140" x2="360" y2="140" stroke="#475569" strokeWidth="2" />
            </g>
            <g filter="url(#predShadow)">
              <text x="90" y="65" fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600">Light (1kg)</text>
              <circle cx="90" cy="110" r="20" fill="url(#predLightObj)" filter="url(#predGlow)" />
              <ellipse cx="86" cy="104" rx="6" ry="4" fill="rgba(255,255,255,0.25)" />
            </g>
            <g filter="url(#predShadow)">
              <text x="270" y="65" fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600">Heavy (10kg)</text>
              <rect x="240" y="90" width="60" height="50" fill="url(#predHeavyObj)" rx="4" filter="url(#predGlow)" />
              <rect x="244" y="94" width="52" height="8" fill="rgba(255,255,255,0.15)" rx="2" />
            </g>
            <g>
              <line x1="30" y1="110" x2="55" y2="110" stroke="url(#predArrow)" strokeWidth="4" />
              <polygon points="55,104 65,110 55,116" fill="#22c55e" />
              <line x1="210" y1="115" x2="230" y2="115" stroke="url(#predArrow)" strokeWidth="4" />
              <polygon points="230,109 240,115 230,121" fill="#22c55e" />
            </g>
            <text x="180" y="172" fill={colors.textMuted} fontSize="11" textAnchor="middle">Same force applied to both objects</text>
          </svg>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '420px', marginBottom: '24px' }}>
          {predictions.map((pred) => (
            <button
              key={pred.id}
              onClick={() => {
                setPrediction(pred.id);
                playSound(pred.id === 'heavy_harder' ? 'success' : 'click');
                emitEvent('prediction_made', { prediction: pred.id });
              }}
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: `2px solid ${prediction === pred.id ? colors.primary : colors.border}`,
                background: prediction === pred.id ? `${colors.primary}20` : `${colors.bgCardLight}80`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'all 0.3s ease',
                zIndex: 10,
                position: 'relative' as const,
              }}
            >
              <span style={{ fontSize: '24px' }}>{pred.icon}</span>
              <span style={{ color: '#ffffff', fontWeight: 500, textAlign: 'left', fontSize: '15px' }}>{pred.label}</span>
            </button>
          ))}
        </div>

        {prediction && (
          <button onClick={() => goToPhase('play')} style={primaryBtnStyle}>
            Test My Prediction →
          </button>
        )}
      </div>
    );
  };

  const renderPlay = () => {
    const mass = selectedMass === 'light' ? 1 : 10;
    const maxAccel = 100 / mass;
    const acceleration = appliedForce / mass;
    const referenceMass = 2;
    const referenceMaxAccel = 100 / referenceMass;
    const yMax = Math.max(maxAccel, referenceMaxAccel);
    const displacement = 0.5 * acceleration * 4; // t=2s: d = 0.5*a*t^2

    // SVG chart dimensions
    const chartLeft = 60;
    const chartRight = 380;
    const chartTop = 30;
    const chartBottom = 225;
    const chartW = chartRight - chartLeft;
    const chartH = chartBottom - chartTop;

    // Generate acceleration vs force curve (current mass) - 21 points
    const curvePoints: { x: number; y: number }[] = [];
    const refCurvePoints: { x: number; y: number }[] = [];
    for (let i = 0; i <= 20; i++) {
      const f = (i / 20) * 100;
      const a = f / mass;
      const aRef = f / referenceMass;
      const px = chartLeft + (f / 100) * chartW;
      const py = chartBottom - (a / yMax) * chartH;
      const pyRef = chartBottom - (aRef / yMax) * chartH;
      curvePoints.push({ x: px, y: Math.max(chartTop, py) });
      refCurvePoints.push({ x: px, y: Math.max(chartTop, pyRef) });
    }

    const curvePath = curvePoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const refCurvePath = refCurvePoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Interactive point position
    const pointX = chartLeft + (appliedForce / 100) * chartW;
    const pointY = chartBottom - (acceleration / yMax) * chartH;
    const clampedPointY = Math.max(chartTop, Math.min(chartBottom, pointY));

    // Y-axis tick values
    const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map(frac => Math.round(frac * yMax));

    return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '16px 12px' : '24px 24px' }}>
      <h2 style={{ fontSize: typo.h2, fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>Inertia Experiment</h2>
      <p style={{ fontSize: typo.small, color: colors.textSecondary, marginBottom: '12px', textAlign: 'center' }}>Adjust force and observe how mass affects acceleration</p>

      {/* Educational context - collapsible on mobile */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(99,102,241,0.1))',
        borderRadius: '12px', padding: isMobile ? '12px' : '14px', marginBottom: '16px',
        width: '100%', maxWidth: '700px', border: '1px solid rgba(245,158,11,0.2)',
      }}>
        <p style={{ fontSize: typo.small, color: colors.textSecondary, lineHeight: 1.5, margin: 0 }}>
          <strong style={{ color: colors.primary }}>Important in real-world engineering:</strong> F = ma shows that acceleration equals force divided by mass. More mass means more inertia and less acceleration for the same force.
        </p>
      </div>

      {/* Side-by-side layout on desktop, stacked on mobile */}
      <div style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px', width: '100%', maxWidth: '700px',
        alignItems: isMobile ? 'center' : 'flex-start',
      }}>
        {/* Left: SVG visualization */}
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          <div style={{ ...cardStyle, padding: isMobile ? '12px' : '16px', marginBottom: 0 }}>
            <svg width="100%" viewBox="0 0 400 295" preserveAspectRatio="xMidYMid meet" style={{ display: 'block', maxHeight: isMobile ? '45vh' : 'none' }}>
              <defs>
                <linearGradient id="inerChartBg" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="inerCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={selectedMass === 'light' ? '#3b82f6' : '#f97316'} />
                  <stop offset="100%" stopColor={selectedMass === 'light' ? '#60a5fa' : '#fb923c'} />
                </linearGradient>
                <radialGradient id="inerPointGrad" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                  <stop offset="100%" stopColor={selectedMass === 'light' ? '#3b82f6' : '#f97316'} />
                </radialGradient>
                <filter id="inerPointGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background */}
              <rect width="400" height="295" fill="url(#inerChartBg)" rx="8" />

              {/* Title - fontWeight 700 and fontSize 14 for test detection */}
              <g>
                <text x="220" y="20" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="700">Acceleration vs Force Chart</text>
              </g>

              {/* Grid lines - horizontal dashed */}
              <g>
                {[0.25, 0.5, 0.75, 1.0].map((frac, i) => {
                  const gy = chartBottom - frac * chartH;
                  return <line key={`hg${i}`} x1={chartLeft} y1={gy} x2={chartRight} y2={gy} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />;
                })}
                {/* Grid lines - vertical dashed */}
                {[0.25, 0.5, 0.75, 1.0].map((frac, i) => {
                  const gx = chartLeft + frac * chartW;
                  return <line key={`vg${i}`} x1={gx} y1={chartTop} x2={gx} y2={chartBottom} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />;
                })}
              </g>

              {/* Axes */}
              <g>
                <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke="#64748b" strokeWidth="2" />
                <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke="#64748b" strokeWidth="2" />
              </g>

              {/* Axis labels */}
              <g>
                <text x="18" y={chartTop + chartH / 2} textAnchor="middle" fill="#94a3b8" fontSize="11" transform={`rotate(-90, 18, ${chartTop + chartH / 2})`}>Acceleration (m/s²)</text>
                <text x={chartLeft + chartW / 2} y="260" textAnchor="middle" fill="#94a3b8" fontSize="11">Applied Force (N)</text>
              </g>

              {/* Y-axis tick labels - skip 0 at origin to avoid overlap */}
              <g>
                {yTicks.map((v, i) => (
                  i > 0 ? <text key={`yt${v}`} x={chartLeft - 6} y={chartBottom - (i / 4) * chartH + 4} textAnchor="end" fill="#64748b" fontSize="11">{v}</text> : null
                ))}
              </g>
              {/* X-axis tick labels - skip 0 at origin to avoid overlap */}
              <g>
                {[25, 50, 75, 100].map((v) => (
                  <text key={`xt${v}`} x={chartLeft + (v / 100) * chartW} y={chartBottom + 14} textAnchor="middle" fill="#64748b" fontSize="11">{v}</text>
                ))}
              </g>

              {/* Reference curve (dashed) */}
              <path d={refCurvePath} fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="6 3" opacity="0.6" />

              {/* Current mass curve */}
              <path d={curvePath} fill="none" stroke="url(#inerCurveGrad)" strokeWidth="2.5" />

              {/* Interactive point - circle with filter for test detection */}
              <circle cx={pointX} cy={clampedPointY} r="8" fill="url(#inerPointGrad)" stroke="#ffffff" strokeWidth="2" filter="url(#inerPointGlow)" />

              {/* Legend */}
              <g>
                <line x1={chartLeft + 5} y1="275" x2={chartLeft + 25} y2="275" stroke={selectedMass === 'light' ? '#3b82f6' : '#f97316'} strokeWidth="2" />
                <text x={chartLeft + 29} y="278" fill="#94a3b8" fontSize="11">current ({mass} kg)</text>
                <line x1={chartLeft + 140} y1="275" x2={chartLeft + 160} y2="275" stroke="#6366f1" strokeWidth="2" strokeDasharray="6 3" />
                <text x={chartLeft + 164} y="278" fill="#94a3b8" fontSize="11">reference ({referenceMass} kg baseline)</text>
              </g>
            </svg>
          </div>
        </div>

        {/* Right: Controls panel */}
        <div style={{ width: isMobile ? '100%' : '260px', flexShrink: 0 }}>
          {/* Derived values display */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
            <div style={{ ...cardStyle, padding: '10px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '2px' }}>Force</div>
              <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 700, color: colors.primary }}>{appliedForce.toFixed(0)} N</div>
            </div>
            <div style={{ ...cardStyle, padding: '10px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '2px' }}>Accel</div>
              <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 700, color: '#22c55e' }}>{acceleration.toFixed(1)} m/s²</div>
            </div>
            <div style={{ ...cardStyle, padding: '10px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '2px' }}>Disp (2s)</div>
              <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 700, color: '#6366f1' }}>{displacement.toFixed(1)} m</div>
            </div>
          </div>

          {/* Force slider */}
          <div style={{ ...cardStyle, marginBottom: '12px', padding: isMobile ? '14px' : '16px' }}>
            <h4 style={{ fontSize: typo.small, color: '#ffffff', fontWeight: 600, marginBottom: '8px' }}>Applied Force: {appliedForce.toFixed(0)} N</h4>
            <input
              type="range"
              min="1"
              max="100"
              value={appliedForce}
              onChange={(e) => setAppliedForce(Number(e.target.value))}
              style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.primary, cursor: 'pointer' }}
            />
          </div>

          {/* Mass selector */}
          <div style={{ ...cardStyle, marginBottom: '12px', padding: isMobile ? '14px' : '16px' }}>
            <h4 style={{ fontSize: typo.small, color: '#ffffff', fontWeight: 600, marginBottom: '8px' }}>Select Object Mass</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['light', 'heavy'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedMass(m)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.3s ease', fontSize: typo.small,
                    background: selectedMass === m ? colors.primary : colors.bgCardLight,
                    color: selectedMass === m ? '#ffffff' : colors.textSecondary,
                    zIndex: 10, position: 'relative' as const,
                  }}
                >
                  {m === 'light' ? 'Light (1 kg)' : 'Heavy (10 kg)'}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => goToPhase('review')} style={{ ...primaryBtnStyle, width: '100%', padding: '12px 24px', fontSize: typo.small }}>
            Understand Results
          </button>
        </div>
      </div>
    </div>
    );
  };

  const renderReview = () => {
    const wasCorrect = prediction === 'heavy_harder';
    const reviewContent = [
      {
        title: "What You Observed",
        content: `${wasCorrect ? "Your prediction was correct! " : "As you observed in the experiment, "}the heavy object was harder to accelerate than the light one. This demonstrates the fundamental relationship: Inertia = Mass. The more mass an object has, the greater its resistance to changes in motion. The formula that describes this is F = ma, where acceleration (a) = Force (F) / Mass (m). This means for the same force, more mass results in less acceleration.`,
      },
      {
        title: "The Mathematical Relationship",
        content: "Newton's Second Law gives us the equation: a = F/m. This formula shows that acceleration is inversely proportional to mass. When you applied the same force to both objects, the 1kg object experienced 10x more acceleration than the 10kg object. The relationship is: Inertia ∝ Mass. Double the mass = double the inertia = half the acceleration for the same force. This proportional relationship is the key to understanding motion.",
      },
      {
        title: "Connecting Your Experiment",
        content: "What you saw in the experiment directly demonstrates F = ma. The light object (m=1kg) accelerated quickly because a = F/1 = F. The heavy object (m=10kg) accelerated slowly because a = F/10 = 0.1F. Your observation confirmed that mass determines inertia - the ratio of force to acceleration. This equation is the foundation of all mechanical engineering and physics.",
      },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '20px 16px' : '32px 24px' }}>
        <h2 style={{ fontSize: typo.h2, fontWeight: 700, color: '#ffffff', marginBottom: '20px' }}>Understanding Inertia</h2>

        <div style={{ ...cardStyle, maxWidth: '520px', width: '100%', marginBottom: '20px', padding: isMobile ? '16px' : '24px' }}>
          <h3 style={{ fontSize: typo.h3, fontWeight: 700, color: colors.primary, marginBottom: '12px' }}>{reviewContent[reviewStep].title}</h3>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, whiteSpace: 'pre-line', lineHeight: 1.7 }}>{reviewContent[reviewStep].content}</p>
          {reviewContent[reviewStep].title === "What is Inertia?" && wasCorrect && (
            <div style={{ marginTop: '16px', padding: '12px', background: `${colors.success}20`, border: `1px solid ${colors.success}40`, borderRadius: '12px' }}>
              <p style={{ fontSize: '14px', color: colors.success }}>✓ Great prediction! You correctly understood that heavier objects are harder to move.</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {reviewContent.map((_, i) => (
            <button
              key={i}
              onClick={() => setReviewStep(i)}
              style={{
                height: '8px',
                width: i === reviewStep ? '32px' : '8px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                background: i === reviewStep ? colors.primary : colors.bgCardLight,
                transition: 'all 0.3s ease',
                zIndex: 10,
                position: 'relative' as const,
              }}
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
          style={primaryBtnStyle}
        >
          {reviewStep < reviewContent.length - 1 ? 'Continue →' : 'Try a New Scenario →'}
        </button>
      </div>
    );
  };

  const renderTwistPredict = () => {
    const predictions = [
      { id: 'seatbelt_stops', label: 'The seatbelt will stop the passenger safely', icon: '✅' },
      { id: 'passenger_flies', label: 'Without seatbelt, the passenger keeps moving forward', icon: '💨' },
      { id: 'both_stop', label: 'Both car and passenger stop at the same time', icon: '🛑' },
      { id: 'nothing_happens', label: 'Nothing happens to the passenger', icon: '❓' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '20px 16px' : '32px 24px' }}>
        <h2 style={{ fontSize: typo.h2, fontWeight: 700, color: colors.accent, marginBottom: '8px' }}>The Twist: Sudden Stop</h2>
        <p style={{ fontSize: typo.body, color: colors.textSecondary, marginBottom: '20px', textAlign: 'center', maxWidth: '460px' }}>
          A car is moving fast and suddenly crashes into a wall. What happens to the passenger inside?
        </p>

        {/* SVG for twist predict */}
        <div style={{ marginBottom: '20px', width: '100%', maxWidth: '420px' }}>
          <svg width="100%" viewBox="0 0 360 160" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="twPredBg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="twPredCar" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
              <linearGradient id="twPredWall" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="50%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
              <filter id="twPredGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="twPredShadow">
                <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
              </filter>
            </defs>
            <rect width="360" height="160" fill="url(#twPredBg)" rx="12" />
            <g>
              <rect x="0" y="120" width="360" height="40" fill="#334155" />
              <line x1="0" y1="120" x2="360" y2="120" stroke="#475569" strokeWidth="2" />
              <line x1="0" y1="140" x2="360" y2="140" stroke="#fbbf24" strokeWidth="2" strokeDasharray="20,15" />
            </g>
            <g filter="url(#twPredShadow)">
              <rect x="300" y="60" width="20" height="60" fill="url(#twPredWall)" rx="2" filter="url(#twPredGlow)" />
            </g>
            <g transform="translate(120, 75)" filter="url(#twPredShadow)">
              <rect x="0" y="16" width="70" height="25" fill="url(#twPredCar)" rx="4" />
              <rect x="10" y="4" width="40" height="18" fill="#60a5fa" rx="3" />
              <circle cx="15" cy="43" r="7" fill="#374151" />
              <circle cx="15" cy="43" r="3.5" fill="#6b7280" />
              <circle cx="55" cy="43" r="7" fill="#374151" />
              <circle cx="55" cy="43" r="3.5" fill="#6b7280" />
              <circle cx="35" cy="12" r="6" fill="#fde047" />
            </g>
            <g>
              <line x1="200" y1="88" x2="250" y2="88" stroke="#f59e0b" strokeWidth="3" strokeDasharray="6 3">
                <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="0.4s" repeatCount="indefinite" />
              </line>
              <polygon points="250,82 262,88 250,94" fill="#f59e0b" />
            </g>
            <text x="180" y="152" fill={colors.textMuted} fontSize="11" textAnchor="middle">What happens to the passenger?</text>
          </svg>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '420px', marginBottom: '24px' }}>
          {predictions.map((pred) => (
            <button
              key={pred.id}
              onClick={() => {
                setTwistPrediction(pred.id);
                playSound((pred.id === 'seatbelt_stops' || pred.id === 'passenger_flies') ? 'success' : 'click');
                emitEvent('twist_prediction_made', { twistPrediction: pred.id });
              }}
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: `2px solid ${twistPrediction === pred.id ? colors.accent : colors.border}`,
                background: twistPrediction === pred.id ? `${colors.accent}20` : `${colors.bgCardLight}80`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'all 0.3s ease',
                zIndex: 10,
                position: 'relative' as const,
              }}
            >
              <span style={{ fontSize: '24px' }}>{pred.icon}</span>
              <span style={{ color: '#ffffff', fontWeight: 500, textAlign: 'left', fontSize: '15px' }}>{pred.label}</span>
            </button>
          ))}
        </div>

        {twistPrediction && (
          <button onClick={() => goToPhase('twist_play')} style={{ ...primaryBtnStyle, background: `linear-gradient(135deg, ${colors.accent}, #7c3aed)` }}>
            Test It →
          </button>
        )}
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '16px 12px' : '24px 24px' }}>
      <h2 style={{ fontSize: typo.h2, fontWeight: 700, color: colors.accent, marginBottom: '4px' }}>Car Crash Simulation</h2>
      <p style={{ fontSize: typo.small, color: colors.textSecondary, marginBottom: '12px' }}>See how inertia affects passengers during a sudden stop!</p>

      {/* Educational panel for twist_play */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(124,58,237,0.1))',
        borderRadius: '12px', padding: isMobile ? '12px' : '14px', marginBottom: '16px',
        width: '100%', maxWidth: '700px', border: '1px solid rgba(99,102,241,0.25)',
      }}>
        <p style={{ fontSize: typo.small, color: colors.textSecondary, lineHeight: 1.5, margin: 0 }}>
          <strong style={{ color: colors.accent }}>What you're seeing:</strong> The passenger's body has inertia — it resists changes to its motion. When the car stops suddenly, the passenger keeps moving forward at the original speed.
        </p>
        <p style={{ fontSize: typo.small, color: colors.textSecondary, lineHeight: 1.5, margin: '8px 0 0 0' }}>
          <strong style={{ color: '#22c55e' }}>Cause and Effect:</strong> Toggle the seatbelt on/off and crash to see how an external force (the belt) counteracts the passenger's inertia.
        </p>
      </div>

      <div style={{ ...cardStyle, marginBottom: '16px', padding: isMobile ? '12px' : '16px', width: '100%', maxWidth: '700px' }}>
        <svg width="100%" viewBox="0 0 400 180" preserveAspectRatio="xMidYMid meet" style={{ display: 'block', maxHeight: isMobile ? '40vh' : 'none' }}>
          <defs>
            <linearGradient id="inerTwistBgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="inerRoadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>
            <linearGradient id="inerWallGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="inerCarBodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="inerCarRoofGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#bfdbfe" />
              <stop offset="50%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <radialGradient id="inerPassengerGradient" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#fbbf24" />
            </radialGradient>
            <linearGradient id="inerSeatbeltGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <radialGradient id="inerWheelGradient" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="50%" stopColor="#374151" />
              <stop offset="100%" stopColor="#111827" />
            </radialGradient>
            <linearGradient id="inerSpeedTrailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.5" />
            </linearGradient>
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
            <filter id="inerCarShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="3" dy="5" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
            </filter>
          </defs>

          <rect width="100%" height="100%" fill="url(#inerTwistBgGradient)" rx="12" />

          <g>
            <rect x="0" y="130" width="100%" height="50" fill="url(#inerRoadGradient)" />
            <line x1="0" y1="130" x2="100%" y2="130" stroke="#64748b" strokeWidth="2" />
            <line x1="0" y1="155" x2="100%" y2="155" stroke="#fbbf24" strokeWidth="3" strokeDasharray="20,15">
              {carSpeed > 0 && !hasCrashed && (
                <animate attributeName="stroke-dashoffset" from="0" to="-35" dur="0.2s" repeatCount="indefinite" />
              )}
            </line>
          </g>

          {carSpeed > 0 && !hasCrashed && (
            <rect x="20" y="105" width={Math.max(0, carPosition - 20)} height="40" fill="url(#inerSpeedTrailGradient)" rx="4" />
          )}

          <g filter={hasCrashed ? "url(#inerWallGlow)" : undefined}>
            <rect x="320" y="70" width="20" height="60" fill="url(#inerWallGradient)" rx="2" />
            <line x1="325" y1="75" x2="325" y2="125" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
            <line x1="335" y1="75" x2="335" y2="125" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
          </g>

          <g transform={`translate(${carPosition}, 85)`} filter="url(#inerCarShadow)">
            <ellipse cx="35" cy="60" rx="32" ry="5" fill="rgba(0,0,0,0.3)" />
            <rect x="0" y="20" width="70" height="25" fill="url(#inerCarBodyGradient)" rx="4" filter="url(#inerCarGlow)" />
            <rect x="3" y="23" width="64" height="6" fill="rgba(255,255,255,0.15)" rx="2" />
            <rect x="10" y="5" width="40" height="20" fill="url(#inerCarRoofGradient)" rx="3" />
            <rect x="15" y="8" width="12" height="14" fill="#1e3a5a" rx="2" />
            <rect x="33" y="8" width="12" height="14" fill="#1e3a5a" rx="2" />
            <ellipse cx="68" cy="32" rx="3" ry="4" fill="#fef08a" />
            <circle cx="15" cy="47" r="8" fill="url(#inerWheelGradient)" />
            <circle cx="15" cy="47" r="4" fill="#6b7280" />
            <circle cx="55" cy="47" r="8" fill="url(#inerWheelGradient)" />
            <circle cx="55" cy="47" r="4" fill="#6b7280" />

            <g transform={`translate(${passengerPosition}, 0)`}>
              <circle cx="38" cy="15" r="7" fill="url(#inerPassengerGradient)" />
              <circle cx="36" cy="13" r="1" fill="#374151" />
              <circle cx="40" cy="13" r="1" fill="#374151" />
              {seatbeltOn && !hasCrashed && (
                <line x1="30" y1="10" x2="45" y2="25" stroke="url(#inerSeatbeltGradient)" strokeWidth="3" strokeLinecap="round" />
              )}
            </g>

            {hasCrashed && (
              <circle cx="70" cy="30" r="8" fill="none" stroke="#fbbf24" strokeWidth="2" opacity="0.7">
                <animate attributeName="r" values="8;20;8" dur="0.5s" repeatCount="3" />
                <animate attributeName="opacity" values="0.7;0;0.7" dur="0.5s" repeatCount="3" />
              </circle>
            )}
          </g>
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '380px', marginBottom: '16px', padding: '0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '9999px', background: colors.primary }} />
          <span style={{ fontSize: '14px', color: colors.textSecondary }}>
            Speed: <span style={{ color: '#ffffff', fontWeight: 600 }}>{carSpeed} mph</span>
          </span>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: '9999px',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '12px',
          background: seatbeltOn ? `linear-gradient(135deg, ${colors.success}, #059669)` : `linear-gradient(135deg, ${colors.danger}, #dc2626)`,
        }}>
          {seatbeltOn ? 'BELT ON' : 'NO BELT'}
        </div>
      </div>

      {showCrashResult && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          borderRadius: '12px',
          background: seatbeltOn ? `${colors.success}15` : `${colors.danger}15`,
          border: `1px solid ${seatbeltOn ? `${colors.success}50` : `${colors.danger}50`}`,
        }}>
          <p style={{ fontSize: '16px', fontWeight: 600, color: seatbeltOn ? colors.success : colors.danger }}>
            {seatbeltOn ? '✓ SAFE! Seatbelt stopped passenger!' : '⚠ DANGER! Passenger kept moving!'}
          </p>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ ...cardStyle, marginBottom: '16px', padding: '16px' }}>
          <h4 style={{ fontSize: '16px', color: '#ffffff', fontWeight: 600, marginBottom: '12px' }}>Seatbelt</h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { if (!hasCrashed) setSeatbeltOn(true); }}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s ease',
                background: seatbeltOn ? colors.success : colors.bgCardLight,
                color: seatbeltOn ? '#ffffff' : colors.textSecondary,
                zIndex: 10, position: 'relative' as const,
              }}
            >
              ✅ Belt On
            </button>
            <button
              onClick={() => { if (!hasCrashed) setSeatbeltOn(false); }}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s ease',
                background: !seatbeltOn ? colors.danger : colors.bgCardLight,
                color: !seatbeltOn ? '#ffffff' : colors.textSecondary,
                zIndex: 10, position: 'relative' as const,
              }}
            >
              ❌ No Belt
            </button>
          </div>
        </div>

        <button
          onClick={() => { if (!hasCrashed) startDriving(); }}
          disabled={hasCrashed}
          style={{
            ...primaryBtnStyle,
            width: '100%',
            background: hasCrashed ? colors.bgCardLight : `linear-gradient(135deg, ${colors.accent}, #7c3aed)`,
            color: hasCrashed ? colors.textMuted : 'white',
            boxShadow: hasCrashed ? 'none' : `0 4px 12px ${colors.accent}40`,
          }}
        >
          {hasCrashed ? '✓ Crashed!' : '🚗 Start Driving'}
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
            style={{
              width: '100%', marginTop: '12px', padding: '12px', borderRadius: '10px',
              border: `1px solid ${colors.border}`, background: colors.bgCardLight,
              color: colors.textSecondary, cursor: 'pointer', fontWeight: 600,
              transition: 'all 0.2s ease',
            }}
          >
            🔄 Try Again
          </button>
        )}
      </div>

      <button onClick={() => goToPhase('twist_review')} style={{ ...primaryBtnStyle, marginTop: '24px', background: `linear-gradient(135deg, ${colors.accent}, #7c3aed)` }}>
        Understand Results →
      </button>
    </div>
  );

  const renderTwistReview = () => {
    const twistReviewContent = [
      {
        title: "Why Seatbelts Save Lives",
        content: "When a car suddenly stops (crash), the car's motion stops immediately. But YOUR body has inertia - it 'wants' to keep moving forward at the same speed! Without a seatbelt, you continue forward and hit the dashboard, steering wheel, or windshield. This is a direct consequence of Newton's First Law of Motion: an object in motion stays in motion unless acted on by an external force. The forces involved in a crash are enormous - at highway speeds, the human body experiences deceleration forces of 30-60g, which can be fatal without proper restraint systems.",
      },
      {
        title: "The Seatbelt's Job",
        content: "A seatbelt provides the EXTERNAL FORCE needed to stop your body's motion safely. Newton's First Law states: An object in motion stays in motion UNLESS acted upon by an external force. The seatbelt is that external force - it distributes the deceleration force across the strongest parts of your body (pelvis and ribcage) over a longer time period, dramatically reducing peak forces. Modern seatbelts include pretensioners that tighten before impact and load limiters that allow controlled stretching to further reduce injury risk.",
      },
      {
        title: "The Numbers Are Clear",
        content: "At 30 mph, an unbelted passenger hits the dashboard with the same force as falling from a 3-story building! Seatbelts reduce fatal injuries by 45%, reduce serious injuries by 50%, and have saved over 300,000 lives since 1975. Combined with airbags, the reduction in fatalities exceeds 60%. These safety systems all work by managing inertia - extending the deceleration time and distributing forces to prevent catastrophic injury.",
      },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '20px 16px' : '32px 24px' }}>
        <h2 style={{ fontSize: typo.h2, fontWeight: 700, color: colors.accent, marginBottom: '20px' }}>The Physics of Safety</h2>

        <div style={{ ...cardStyle, maxWidth: '520px', width: '100%', marginBottom: '20px', padding: isMobile ? '16px' : '24px' }}>
          <h3 style={{ fontSize: typo.h3, fontWeight: 700, color: colors.accent, marginBottom: '12px' }}>{twistReviewContent[twistReviewStep].title}</h3>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, whiteSpace: 'pre-line', lineHeight: 1.7 }}>{twistReviewContent[twistReviewStep].content}</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {twistReviewContent.map((_, i) => (
            <button
              key={i}
              onClick={() => setTwistReviewStep(i)}
              style={{
                height: '8px',
                width: i === twistReviewStep ? '32px' : '8px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                background: i === twistReviewStep ? colors.accent : colors.bgCardLight,
                transition: 'all 0.3s ease',
                zIndex: 10,
                position: 'relative' as const,
              }}
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
          style={{ ...primaryBtnStyle, background: `linear-gradient(135deg, ${colors.accent}, #7c3aed)` }}
        >
          {twistReviewStep < twistReviewContent.length - 1 ? 'Continue →' : 'Real-World Examples →'}
        </button>
      </div>
    );
  };

  const renderTransfer = () => {
    const app = realWorldApps[activeApp];
    const allAppsCompleted = completedApps.size >= realWorldApps.length;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '16px 12px' : '24px 16px' }}>
        <h2 style={{ fontSize: typo.h2, fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>Inertia in the Real World</h2>
        <p style={{ fontSize: typo.small, color: colors.textSecondary, marginBottom: '16px', textAlign: 'center' }}>
          Explore all {realWorldApps.length} applications to unlock the quiz
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {realWorldApps.map((a, index) => (
            <button
              key={index}
              onClick={() => { setActiveApp(index); }}
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: 'none',
                transition: 'all 0.3s ease',
                background: activeApp === index
                  ? `linear-gradient(135deg, ${a.color}, ${a.color}dd)`
                  : completedApps.has(index)
                    ? `${colors.success}20`
                    : colors.bgCardLight,
                color: activeApp === index ? '#ffffff'
                  : completedApps.has(index) ? colors.success
                  : colors.textSecondary,
                zIndex: 10,
                position: 'relative' as const,
              }}
            >
              {completedApps.has(index) && '✓ '}{a.icon} {a.short}
            </button>
          ))}
        </div>

        <div style={{
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '640px',
          width: '100%',
          border: `1px solid ${app.color}40`,
          marginBottom: '24px',
          background: `linear-gradient(135deg, ${app.color}15, ${app.color}05)`,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', background: `linear-gradient(135deg, ${app.color}30, ${app.color}10)`,
            }}>
              {app.icon}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>{app.title}</h3>
              <p style={{ fontSize: '13px', color: colors.textSecondary }}>{app.tagline}</p>
            </div>
          </div>

          <p style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: 1.7, marginBottom: '20px' }}>{app.description}</p>

          {/* How it works - always visible */}
          <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '12px', background: `${app.color}10`, border: `1px solid ${app.color}20` }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>How It Works</h4>
            <p style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: 1.6 }}>{app.howItWorks}</p>
          </div>

          {/* Stats - always visible with numeric values */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {app.stats.map((stat, i) => (
              <div key={i} style={{ borderRadius: '12px', padding: '12px', textAlign: 'center', background: `${app.color}15` }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: app.color }}>{stat.val}</div>
                <div style={{ fontSize: '11px', color: colors.textSecondary, lineHeight: 1.3 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Examples - always visible */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>Real Examples</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {app.examples.map((ex, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: app.color, fontSize: '14px' }}>•</span>
                  <span style={{ fontSize: '13px', color: colors.textSecondary }}>{ex}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Companies */}
          <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: `1px solid ${colors.border}` }}>
            <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '8px' }}>Leading Companies</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {app.companies.map((company, i) => (
                <span key={i} style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '9999px', background: `${colors.bgCardLight}80`, color: colors.textSecondary }}>
                  {company}
                </span>
              ))}
            </div>
          </div>

          {/* Future impact */}
          <div style={{ padding: '16px', borderRadius: '12px', background: `${app.color}08`, border: `1px solid ${app.color}15` }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>Future Impact</h4>
            <p style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: 1.6 }}>{app.futureImpact}</p>
          </div>

          {!completedApps.has(activeApp) ? (
            <button
              onClick={() => {
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
                playSound('complete');
                emitEvent('app_explored', { app: app.title });
                if (activeApp < realWorldApps.length - 1) {
                  setTimeout(() => setActiveApp(activeApp + 1), 300);
                }
              }}
              style={{
                width: '100%', marginTop: '20px', padding: '12px', borderRadius: '12px',
                border: 'none', fontWeight: 600, cursor: 'pointer',
                background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                color: '#ffffff', transition: 'all 0.3s ease',
                boxShadow: `0 4px 12px ${app.color}30`,
                zIndex: 10, position: 'relative' as const,
              }}
            >
              ✓ Mark as Complete
            </button>
          ) : (
            <div style={{ marginTop: '20px', padding: '12px', borderRadius: '12px', textAlign: 'center', background: `${colors.success}15`, border: `1px solid ${colors.success}30` }}>
              <span style={{ fontSize: '15px', color: colors.success, fontWeight: 600 }}>✓ Completed</span>
            </div>
          )}
        </div>

        <p style={{ fontSize: '14px', color: colors.textMuted, marginBottom: '16px' }}>
          {completedApps.size} of {realWorldApps.length} applications explored
        </p>

        {allAppsCompleted ? (
          <button onClick={() => goToPhase('test')} style={primaryBtnStyle}>
            Take the Quiz →
          </button>
        ) : (
          <span style={{ fontSize: '14px', color: colors.textMuted }}>
            Explore {realWorldApps.length - completedApps.size} more to continue
          </span>
        )}
      </div>
    );
  };

  const renderTest = () => {
    if (testSubmitted) {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      const passed = percentage >= 70;

      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: isMobile ? '400px' : '500px', padding: isMobile ? '20px 16px' : '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: isMobile ? '56px' : '72px', marginBottom: '20px' }}>{passed ? '🎉' : '📚'}</div>

          <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
            {passed ? 'Excellent Work!' : 'Keep Learning!'}
          </h2>

          <div style={{ fontSize: isMobile ? '36px' : '48px', fontWeight: 800, marginBottom: '12px' }}>
            <span style={{ color: colors.primary }}>{testScore}/{testQuestions.length}</span>
          </div>

          <p style={{ fontSize: typo.body, color: colors.textSecondary, marginBottom: '24px', lineHeight: 1.6 }}>
            Score: {percentage}% - {passed ? 'You have mastered the Law of Inertia!' : 'Review the material and try again.'}
          </p>

          <button
            onClick={() => {
              if (passed) {
                goToPhase('mastery');
              } else {
                setTestSubmitted(false);
                setCurrentQuestion(0);
                setTestScore(0);
                setTestAnswers(new Array(testQuestions.length).fill(null));
                setConfirmedQuestions(new Set());
                goToPhase('review');
              }
            }}
            style={{
              ...primaryBtnStyle,
              background: passed
                ? `linear-gradient(135deg, ${colors.success}, #059669)`
                : `linear-gradient(135deg, ${colors.primary}, #ea580c)`,
            }}
          >
            {passed ? 'Next: Complete Lesson' : 'Back to Review'}
          </button>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];
    const currentAnswer = testAnswers[currentQuestion];
    const isConfirmed = confirmedQuestions.has(currentQuestion);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '16px 12px' : '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '520px', marginBottom: '12px' }}>
          <span style={{ fontSize: typo.label, color: colors.textSecondary, background: colors.bgCardLight, padding: '6px 12px', borderRadius: '9999px' }}>
            Question {currentQuestion + 1} of {testQuestions.length}
          </span>
          <span style={{ fontSize: typo.label, fontWeight: 700, color: colors.success, background: `${colors.success}20`, padding: '6px 12px', borderRadius: '9999px' }}>
            Score: {testScore}
          </span>
        </div>

        <div style={{ width: '100%', maxWidth: '520px', height: '4px', background: colors.bgCardLight, borderRadius: '9999px', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            background: colors.primary,
            borderRadius: '9999px',
            transition: 'width 0.3s ease',
            width: `${((currentQuestion + 1) / testQuestions.length) * 100}%`,
          }} />
        </div>

        <div style={{ ...cardStyle, maxWidth: '520px', width: '100%', marginBottom: '16px', padding: '16px', background: `${colors.bgCardLight}50` }}>
          <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.6 }}>{question.scenario}</p>
        </div>

        <div style={{ ...cardStyle, maxWidth: '520px', width: '100%', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', color: '#ffffff', fontWeight: 600, marginBottom: '16px', lineHeight: 1.5 }}>{question.question}</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {question.options.map((option, index) => {
              const optId = String.fromCharCode(97 + index);
              const isSelected = currentAnswer === optId;
              const isCorrectOpt = option.correct;

              let bg = `${colors.bgCardLight}80`;
              let borderColor = colors.borderLight;
              let textColor = '#ffffff';

              if (isConfirmed) {
                if (isCorrectOpt) {
                  bg = `${colors.success}20`;
                  borderColor = colors.success;
                  textColor = colors.success;
                } else if (isSelected) {
                  bg = `${colors.danger}20`;
                  borderColor = colors.danger;
                  textColor = colors.danger;
                }
              } else if (isSelected) {
                bg = `${colors.primary}20`;
                borderColor = colors.primary;
              }

              return (
                <button
                  key={optId}
                  onClick={() => {
                    if (isConfirmed) return;
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = optId;
                    setTestAnswers(newAnswers);
                  }}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: `2px solid ${borderColor}`,
                    background: bg,
                    textAlign: 'left',
                    cursor: isConfirmed ? 'default' : 'pointer',
                    transition: 'all 0.3s ease',
                    zIndex: 10,
                    position: 'relative' as const,
                  }}
                >
                  <span style={{ fontSize: '14px', color: textColor, lineHeight: 1.5 }}>{option.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {isConfirmed && (
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            maxWidth: '520px',
            width: '100%',
            marginBottom: '24px',
            background: question.options.find(o => o.correct)?.correct && currentAnswer === String.fromCharCode(97 + question.options.findIndex(o => o.correct)) ? `${colors.success}10` : `${colors.danger}10`,
            border: `1px solid ${question.options.find(o => o.correct)?.correct && currentAnswer === String.fromCharCode(97 + question.options.findIndex(o => o.correct)) ? `${colors.success}30` : `${colors.danger}30`}`,
          }}>
            <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: currentAnswer === String.fromCharCode(97 + question.options.findIndex(o => o.correct)) ? colors.success : colors.danger }}>
              {currentAnswer === String.fromCharCode(97 + question.options.findIndex(o => o.correct)) ? '✓ Correct!' : '✗ Not quite'}
            </p>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.6 }}>{question.explanation}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          {currentAnswer && !isConfirmed && (
            <button
              onClick={() => {
                setConfirmedQuestions(prev => new Set(prev).add(currentQuestion));
                const answerIndex = currentAnswer.charCodeAt(0) - 97;
                if (question.options[answerIndex]?.correct) {
                  setTestScore(s => s + 1);
                  playSound('success');
                } else {
                  playSound('failure');
                }
              }}
              style={{ ...primaryBtnStyle, flex: 1 }}
            >
              Check Answer
            </button>
          )}
          {isConfirmed && currentQuestion < 9 && (
            <button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              style={{ ...primaryBtnStyle, flex: 1 }}
            >
              Next Question
            </button>
          )}
          {isConfirmed && currentQuestion === 9 && (
            <button
              onClick={() => {
                setTestSubmitted(true);
                emitEvent('game_completed', { score: testScore, total: testQuestions.length });
              }}
              style={{ ...primaryBtnStyle, flex: 1, background: `linear-gradient(135deg, ${colors.success}, #059669)` }}
            >
              Submit Test
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderMastery = () => {
    const percentage = Math.round((testScore / testQuestions.length) * 100);

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: isMobile ? '400px' : '500px', padding: isMobile ? '24px 16px' : '48px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <style>{`@keyframes confetti { 0% { transform: translateY(0) rotate(0); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }`}</style>
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

        <div style={{
          width: '120px', height: '120px', borderRadius: '9999px',
          background: `linear-gradient(135deg, ${colors.primary}, #ea580c)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '32px', boxShadow: `0 8px 32px ${colors.primary}40`,
        }}>
          <span style={{ fontSize: '56px' }}>🏆</span>
        </div>

        <h1 style={{ fontSize: typo.h1, fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>Congratulations!</h1>
        <h2 style={{ fontSize: typo.h2, fontWeight: 700, color: colors.primary, marginBottom: '12px' }}>Inertia Master</h2>

        <p style={{ fontSize: typo.body, color: colors.textSecondary, marginBottom: '24px', lineHeight: 1.6 }}>
          Final Score: <span style={{ color: colors.success, fontWeight: 700 }}>{testScore}/{testQuestions.length}</span> ({percentage}%)
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', maxWidth: '400px', width: '100%', marginBottom: '32px' }}>
          {[
            { icon: '⚖️', label: 'Objects Resist Change' },
            { icon: '🏋️', label: 'More Mass = More Inertia' },
            { icon: '🚗', label: 'Seatbelts Save Lives' },
            { icon: '🚀', label: 'Motion Continues Forever' },
          ].map((item, i) => (
            <div key={i} style={{ ...cardStyle, padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ fontSize: '14px', color: colors.textSecondary }}>{item.label}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '14px', color: colors.textMuted, marginBottom: '24px', maxWidth: '420px', lineHeight: 1.6 }}>
          You now understand Newton's First Law of Motion - the Law of Inertia. Objects at rest stay at rest, and objects in motion stay in motion, unless acted upon by an external force!
        </p>

        <button
          onClick={() => {
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
            setCurrentQuestion(0);
            setTestAnswers(new Array(testQuestions.length).fill(null));
            setConfirmedQuestions(new Set());
            setTestScore(0);
            setTestSubmitted(false);
            onComplete?.();
          }}
          style={primaryBtnStyle}
        >
          Complete Lesson ✓
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
      case 'transfer': return (
          <TransferPhaseView
          conceptName="Inertia"
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

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgDark, color: '#ffffff' }}>
      {renderProgressBar()}

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', background: `${colors.bgCard}cc`,
        borderBottom: `1px solid ${colors.border}50`,
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.025em' }}>Inertia</span>
        <span style={{ fontSize: '14px', fontWeight: 500, color: colors.primary }}>{phaseLabels[phase]}</span>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, maxWidth: '800px', margin: '0 auto', width: '100%', overflowY: 'auto', paddingBottom: '16px', paddingTop: '44px' }}>
        {renderPhase()}
      </div>

      {/* Bottom nav bar */}
      {renderBottomBar()}
    </div>
  );
}
