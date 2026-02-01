'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

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

// Premium Design System
const premiumDesign = {
  colors: {
    primary: '#6366F1',
    primaryDark: '#4F46E5',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    magnet: '#EF4444',
    eddy: '#3B82F6',
    conductor: '#94A3B8',
    background: {
      primary: '#0F0F1A',
      secondary: '#1A1A2E',
      tertiary: '#252542',
      card: 'rgba(255, 255, 255, 0.03)',
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.7)',
      muted: 'rgba(255, 255, 255, 0.4)',
    },
    gradient: {
      primary: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
      secondary: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
      warm: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
      cool: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
      eddy: 'linear-gradient(135deg, #EF4444 0%, #8B5CF6 100%)',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 },
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.2)',
    md: '0 4px 16px rgba(0, 0, 0, 0.3)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.4)',
    glow: (color: string) => `0 0 20px ${color}40`,
  },
};

interface EddyCurrentsRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

export default function EddyCurrentsRenderer({ onGameEvent, gamePhase, onPhaseComplete }: EddyCurrentsRendererProps) {
  // Core State
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  });
  const [isMobile, setIsMobile] = useState(false);

  // Hook phase
  const [hookStep, setHookStep] = useState(0);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);

  // Play phase - Magnetic braking simulation
  const [magnetY, setMagnetY] = useState(50);
  const [magnetVelocity, setMagnetVelocity] = useState(0);
  const [conductorType, setConductorType] = useState<'copper' | 'aluminum' | 'air'>('copper');
  const [isDropping, setIsDropping] = useState(false);
  const [eddyStrength, setEddyStrength] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - Pendulum damping
  const [pendulumAngle, setPendulumAngle] = useState(60);
  const [pendulumVelocity, setPendulumVelocity] = useState(0);
  const [dampingEnabled, setDampingEnabled] = useState(false);
  const [isPendulumRunning, setIsPendulumRunning] = useState(false);
  const [swingCount, setSwingCount] = useState(0);
  const pendulumRef = useRef<number | null>(null);

  // Twist review
  const [twistReviewStep, setTwistReviewStep] = useState(0);

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test phase
  const [testQuestions] = useState([
    {
      scenario: "A science teacher drops a strong magnet through a vertical copper tube and a vertical PVC plastic tube of the same dimensions. Students observe that the magnet falls much slower through the copper tube.",
      question: "Why does the magnet fall slowly through the copper tube but quickly through the plastic tube?",
      options: [
        { id: 'a', label: "Copper is magnetic and attracts the magnet, slowing it down" },
        { id: 'b', label: "The changing magnetic field induces eddy currents in copper, which create an opposing magnetic field", correct: true },
        { id: 'c', label: "Air resistance is higher inside copper tubes" },
        { id: 'd', label: "Copper tubes have more friction on their inner surface" }
      ],
      explanation: "As the magnet falls, its magnetic field passes through the copper (a conductor), inducing circular eddy currents. By Lenz's Law, these currents create a magnetic field that opposes the change - in this case, opposing the magnet's motion. Plastic is non-conductive, so no eddy currents form."
    },
    {
      scenario: "A roller coaster uses electromagnetic brakes at the end of the ride. Unlike traditional friction brakes, these never need pad replacements despite hundreds of daily stops.",
      question: "How do electromagnetic brakes stop the roller coaster without physical contact?",
      options: [
        { id: 'a', label: "They shoot compressed air at the wheels" },
        { id: 'b', label: "Strong magnets pass near conducting fins, inducing eddy currents that oppose the motion", correct: true },
        { id: 'c', label: "Electric shocks slow down the cars" },
        { id: 'd', label: "Reverse motors push against the wheels" }
      ],
      explanation: "Electromagnetic brakes work by passing conductors (metal fins on the coaster) through a magnetic field. This induces eddy currents that create an opposing magnetic force, slowing the vehicle. Since there's no physical contact, there's no wear - making them ideal for high-use applications like roller coasters and high-speed trains."
    },
    {
      scenario: "An induction cooktop heats a steel pan placed on its surface, but when someone tries to use a glass pot, it doesn't heat up at all.",
      question: "Why does the induction cooktop only heat metal cookware?",
      options: [
        { id: 'a', label: "Metal pots are darker and absorb more heat" },
        { id: 'b', label: "The cooktop uses a rapidly changing magnetic field to induce eddy currents, which only form in conductors", correct: true },
        { id: 'c', label: "Glass pots reflect the infrared heat from the cooktop" },
        { id: 'd', label: "Metal pots make better contact with the heating surface" }
      ],
      explanation: "Induction cooktops generate a rapidly alternating magnetic field. When a metal pan is placed above, this changing field induces eddy currents in the pan. The pan's electrical resistance converts these currents into heat. Glass is non-conductive, so no eddy currents can form, and it remains cool."
    },
    {
      scenario: "Engineers designing electric power transformers notice significant energy is being lost as heat in the iron core. They propose a solution to reduce these losses.",
      question: "How do engineers reduce eddy current losses in transformer cores?",
      options: [
        { id: 'a', label: "Use solid copper cores instead of iron" },
        { id: 'b', label: "Laminate the core with thin insulated sheets to break up eddy current paths", correct: true },
        { id: 'c', label: "Make the core smaller" },
        { id: 'd', label: "Run the transformer at higher frequency" }
      ],
      explanation: "Laminated cores consist of thin iron sheets coated with insulation stacked together. This breaks up the large circular paths that eddy currents would follow in a solid core, forcing them into smaller, weaker loops. This dramatically reduces energy losses while maintaining the magnetic properties needed for the transformer."
    },
    {
      scenario: "A metal detector at an airport beeps when someone walks through with a metal belt buckle, but not when they have a plastic comb in their pocket.",
      question: "How does the metal detector distinguish between metal and non-metal objects?",
      options: [
        { id: 'a', label: "It weighs the person and detects heavier objects" },
        { id: 'b', label: "The detector's magnetic field induces eddy currents only in metals, which are then detected", correct: true },
        { id: 'c', label: "It uses X-rays to see inside pockets" },
        { id: 'd', label: "Metal reflects radio waves while plastic absorbs them" }
      ],
      explanation: "Metal detectors emit a changing magnetic field. When metal passes through, eddy currents are induced in the metal object. These eddy currents create their own magnetic field, which is detected by the sensor. Non-conductive materials like plastic cannot support eddy currents, so they don't trigger the detector."
    },
    {
      scenario: "A physicist notices that when she moves a magnet toward a copper plate, she feels resistance, as if something is pushing back. When she pulls the magnet away, she again feels resistance.",
      question: "What explains this resistance to both approaching and retreating the magnet?",
      options: [
        { id: 'a', label: "Copper naturally repels all magnets" },
        { id: 'b', label: "Eddy currents always create a field that opposes any change in magnetic flux (Lenz's Law)", correct: true },
        { id: 'c', label: "Air pressure between the magnet and copper" },
        { id: 'd', label: "Static electricity building up on the copper surface" }
      ],
      explanation: "Lenz's Law states that induced currents always oppose the change that created them. When approaching, eddy currents create a repelling field. When retreating, they create an attracting field. Either way, the eddy currents resist the change in magnetic flux, creating the felt resistance."
    },
    {
      scenario: "High-speed trains like the Shinkansen use regenerative braking combined with electromagnetic brakes. Engineers observe the electromagnetic braking force is stronger at higher speeds.",
      question: "Why does electromagnetic braking force increase with the train's speed?",
      options: [
        { id: 'a', label: "The magnets get hotter at high speed and become stronger" },
        { id: 'b', label: "Faster motion means faster-changing magnetic flux, inducing stronger eddy currents", correct: true },
        { id: 'c', label: "Wind resistance adds to the braking force" },
        { id: 'd', label: "The train's weight increases with speed" }
      ],
      explanation: "The strength of induced eddy currents depends on how quickly the magnetic flux changes (Faraday's Law). At higher speeds, the rate of change of magnetic flux is greater, inducing larger eddy currents and therefore a stronger opposing magnetic force. This makes electromagnetic brakes particularly effective for slowing high-speed vehicles."
    },
    {
      scenario: "A renewable energy company is testing a new type of generator. When they spin a copper disk between strong magnets, they can extract electrical current, but the disk gets warm during operation.",
      question: "Why does the spinning copper disk heat up during electricity generation?",
      options: [
        { id: 'a', label: "Friction between the disk and the magnets" },
        { id: 'b', label: "Eddy currents flowing through the disk's resistance convert energy to heat", correct: true },
        { id: 'c', label: "The magnets emit infrared radiation" },
        { id: 'd', label: "Chemical reactions in the copper" }
      ],
      explanation: "When eddy currents flow through a conductor, they encounter electrical resistance. According to Joule heating (P = I²R), this resistance converts electrical energy into heat. This is the same principle that makes induction cooktops work - it's useful for cooking but represents energy loss in generators and transformers."
    },
    {
      scenario: "A factory uses an electromagnetic sorting system to separate aluminum cans from non-metallic waste on a conveyor belt without any physical contact.",
      question: "How can the electromagnetic system push aluminum cans off the belt if aluminum is not magnetic?",
      options: [
        { id: 'a', label: "Aluminum becomes temporarily magnetized by the strong field" },
        { id: 'b', label: "Eddy currents induced in the aluminum create a field that is repelled by the source magnets", correct: true },
        { id: 'c', label: "The system uses static electricity to attract the cans" },
        { id: 'd', label: "High-frequency vibrations shake the cans off the belt" }
      ],
      explanation: "Although aluminum is not ferromagnetic (not attracted to magnets), it is an excellent conductor. When aluminum passes through a changing magnetic field, eddy currents are induced. These currents create their own magnetic field that interacts with the source field, generating a repulsive force that pushes the cans off the belt."
    },
    {
      scenario: "A physics student wonders why Lenz's Law states that eddy currents must oppose the change that creates them, rather than enhancing it.",
      question: "What fundamental physical principle requires eddy currents to oppose rather than enhance the change?",
      options: [
        { id: 'a', label: "Newton's third law of motion" },
        { id: 'b', label: "Conservation of energy - enhancing the change would create energy from nothing", correct: true },
        { id: 'c', label: "The uncertainty principle" },
        { id: 'd', label: "The principle of least action" }
      ],
      explanation: "If eddy currents enhanced the motion that creates them, a falling magnet would accelerate faster through a copper tube, gaining kinetic energy without any input - a violation of energy conservation. Lenz's Law is essentially a statement of energy conservation applied to electromagnetic induction."
    }
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [testComplete, setTestComplete] = useState(false);

  // Conductivity values
  const conductivity: Record<string, number> = {
    copper: 1.0,
    aluminum: 0.6,
    air: 0,
  };

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
    } catch { /* Audio not supported */ }
  }, []);

  // Event emitter
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Simplified phase navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    if (!phaseOrder.includes(newPhase)) return;
    setPhase(newPhase);
    playSound('transition');
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(newPhase);
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) goToPhase(phaseOrder[currentIndex + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]);
  }, [phase, goToPhase]);

  // Magnet dropping animation
  useEffect(() => {
    if (phase === 'play' && isDropping) {
      const animate = () => {
        setMagnetY(prevY => {
          const sigma = conductivity[conductorType];

          // Calculate eddy braking force (proportional to velocity and conductivity)
          const eddyBrake = magnetVelocity * sigma * 0.15;
          setEddyStrength(Math.abs(eddyBrake) * 10);

          // Update velocity: gravity - eddy braking
          const newVelocity = magnetVelocity + 0.2 - eddyBrake;
          setMagnetVelocity(newVelocity);

          // Update position
          const newY = prevY + newVelocity;

          // Check if reached bottom
          if (newY >= 230) {
            setIsDropping(false);
            setMagnetVelocity(0);
            return 230;
          }

          return newY;
        });

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [phase, isDropping, magnetVelocity, conductorType]);

  // Pendulum animation
  useEffect(() => {
    if (phase === 'twist_play' && isPendulumRunning) {
      let lastTime = Date.now();
      let crossedZero = false;

      const animate = () => {
        const now = Date.now();
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        setPendulumAngle(prevAngle => {
          // Angular acceleration from gravity
          const gravity = -0.5 * Math.sin(prevAngle * Math.PI / 180);

          // Damping from eddy currents (proportional to velocity)
          const damping = dampingEnabled ? -pendulumVelocity * 0.08 : -pendulumVelocity * 0.005;

          // Update velocity
          const newVelocity = pendulumVelocity + (gravity + damping) * 60 * dt;
          setPendulumVelocity(newVelocity);

          // Track swings
          if (prevAngle > 0 && prevAngle + newVelocity <= 0) {
            if (!crossedZero) {
              setSwingCount(c => c + 1);
              crossedZero = true;
            }
          } else if (prevAngle < 0) {
            crossedZero = false;
          }

          // Update angle
          const newAngle = prevAngle + newVelocity;

          // Stop if nearly stopped
          if (Math.abs(newAngle) < 0.5 && Math.abs(newVelocity) < 0.1) {
            setIsPendulumRunning(false);
            setPendulumVelocity(0);
            return 0;
          }

          return newAngle;
        });

        pendulumRef.current = requestAnimationFrame(animate);
      };

      pendulumRef.current = requestAnimationFrame(animate);

      return () => {
        if (pendulumRef.current) {
          cancelAnimationFrame(pendulumRef.current);
        }
      };
    }
  }, [phase, isPendulumRunning, pendulumVelocity, dampingEnabled]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (pendulumRef.current) cancelAnimationFrame(pendulumRef.current);
    };
  }, [phase]);

  // Reset magnet
  const resetMagnet = () => {
    setMagnetY(50);
    setMagnetVelocity(0);
    setIsDropping(false);
    setEddyStrength(0);
  };

  // Reset pendulum
  const resetPendulum = () => {
    setPendulumAngle(60);
    setPendulumVelocity(0);
    setIsPendulumRunning(false);
    setSwingCount(0);
  };

  // Helper functions for UI elements
  function renderButton(
    text: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'success' = 'primary',
    disabled = false
  ) {
    const baseStyle: React.CSSProperties = {
      padding: isMobile ? '14px 24px' : '16px 32px',
      borderRadius: premiumDesign.radius.lg,
      border: 'none',
      fontSize: isMobile ? '15px' : '16px',
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.3s ease',
      fontFamily: premiumDesign.typography.fontFamily,
      opacity: disabled ? 0.5 : 1,
      zIndex: 10,
    };

    const variants = {
      primary: {
        background: premiumDesign.colors.gradient.primary,
        color: 'white',
        boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.primary),
      },
      secondary: {
        background: premiumDesign.colors.background.tertiary,
        color: premiumDesign.colors.text.primary,
        border: `1px solid rgba(255,255,255,0.1)`,
      },
      success: {
        background: premiumDesign.colors.gradient.eddy,
        color: 'white',
        boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.magnet),
      },
    };

    return (
      <button
        style={{ ...baseStyle, ...variants[variant] }}
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) onClick();
        }}
        disabled={disabled}
      >
        {text}
      </button>
    );
  }

  function renderProgressBar() {
    const currentIndex = phaseOrder.indexOf(phase);
    const progress = ((currentIndex + 1) / phaseOrder.length) * 100;

    return (
      <div style={{ marginBottom: premiumDesign.spacing.lg }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: premiumDesign.spacing.xs,
          fontSize: '12px',
          color: premiumDesign.colors.text.muted,
        }}>
          <span>Phase {currentIndex + 1} of {phaseOrder.length}</span>
          <span>{phase.replace('_', ' ').toUpperCase()}</span>
        </div>
        <div style={{
          height: 6,
          background: premiumDesign.colors.background.tertiary,
          borderRadius: premiumDesign.radius.full,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: premiumDesign.colors.gradient.eddy,
            borderRadius: premiumDesign.radius.full,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
    );
  }

  function renderBottomBar(
    leftButton?: { text: string; onClick: () => void },
    rightButton?: { text: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'success'; disabled?: boolean }
  ) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: premiumDesign.spacing.xl,
        paddingTop: premiumDesign.spacing.lg,
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        {leftButton ? renderButton(leftButton.text, leftButton.onClick, 'secondary') : <div />}
        {rightButton && renderButton(rightButton.text, rightButton.onClick, rightButton.variant || 'primary', rightButton.disabled)}
      </div>
    );
  }

  // Real-World Applications Data
  const realWorldApps = [
    {
      icon: "🎢",
      title: "Electromagnetic Brakes",
      short: "Roller Coasters & Trains",
      tagline: "Stopping thrill rides with invisible force",
      description: "Electromagnetic brakes are the silent guardians of amusement parks worldwide. Unlike traditional friction brakes that wear down and can fail, electromagnetic brakes use eddy currents to slow vehicles without any physical contact. When a roller coaster car passes through a series of powerful permanent magnets or electromagnets, eddy currents are induced in metal fins attached to the car. These currents create opposing magnetic fields that resist motion, providing smooth, reliable braking that never wears out. The faster the vehicle moves, the stronger the braking force—a self-regulating safety feature that makes them ideal for high-speed applications.",
      connection: "Just like our falling magnet slows down in the copper tube, the metal fins on roller coaster cars experience eddy currents when passing through magnetic fields. The opposing magnetic force converts kinetic energy into heat, bringing multi-ton vehicles to a smooth stop without any mechanical contact or wear.",
      howItWorks: "Powerful neodymium magnets are arranged in alternating poles along the brake section. As conductive fins on the train pass between these magnets, the changing magnetic flux induces circular eddy currents in the metal. According to Lenz's Law, these currents create their own magnetic fields that oppose the motion. The braking force is proportional to velocity—faster approach means stronger braking. Heat generated in the fins dissipates naturally into the air.",
      stats: [
        { val: "120+ mph", label: "Maximum braking speeds" },
        { val: "0", label: "Mechanical contact points" },
        { val: "50+ years", label: "Operational lifespan" }
      ],
      examples: [
        "Tower of Terror drop tower brakes at Disney parks",
        "Kingda Ka's 128 mph launch braking system",
        "Magnetic levitation (maglev) train emergency brakes",
        "High-speed rail eddy current track brakes"
      ],
      companies: ["Intamin", "Bolliger & Mabillard", "Siemens", "Magnetic Technologies"],
      futureImpact: "Next-generation hyperloop systems will rely entirely on electromagnetic braking for their 700+ mph pods. Advanced superconducting electromagnets will provide even stronger braking forces while regenerative systems capture braking energy to recharge onboard batteries, making transportation both safer and more sustainable.",
      color: "#EF4444"
    },
    {
      icon: "🪙",
      title: "Coin Sorting Machines",
      short: "Vending & Banking",
      tagline: "Sorting billions of coins at lightning speed",
      description: "Every day, billions of coins flow through vending machines, arcade games, and bank sorting equipment. Eddy current coin validators can distinguish genuine coins from counterfeits and sort different denominations in milliseconds. When a coin rolls past a coil carrying alternating current, eddy currents are induced in the metal. The size, composition, and thickness of each coin produces a unique electromagnetic signature. Copper coins respond differently than nickel-plated steel, allowing machines to instantly reject slugs, foreign coins, or counterfeits while sorting valid currency at speeds exceeding 3,000 coins per minute.",
      connection: "Just as different conductor materials in our experiment (copper vs aluminum vs air) produced different eddy current strengths, different coin compositions create unique electromagnetic signatures. The machine essentially performs our experiment thousands of times per minute, measuring how strongly each coin interacts with the magnetic field.",
      howItWorks: "An oscillating electromagnetic coil generates an alternating magnetic field. As a coin passes through, eddy currents induced in the metal create a secondary magnetic field that opposes and modifies the original. Sensors measure changes in coil inductance and energy absorption—parameters that depend on the coin's conductivity, permeability, size, and thickness. A microprocessor compares these readings against stored profiles to identify the coin in under 20 milliseconds.",
      stats: [
        { val: "3,000+", label: "Coins sorted per minute" },
        { val: "20ms", label: "Validation time per coin" },
        { val: "99.9%", label: "Counterfeit detection rate" }
      ],
      examples: [
        "Self-checkout machines at grocery stores",
        "Casino slot machine coin acceptors",
        "Bank coin counting and sorting equipment",
        "Parking meter payment systems"
      ],
      companies: ["Crane Payment Innovations", "MEI Conlux", "Azkoyen", "Suzohapp", "Glory Global Solutions"],
      futureImpact: "As cashless payments grow, eddy current technology is finding new applications in metal recycling—sorting aluminum, copper, and precious metals from electronic waste with unprecedented precision. Future smart recycling facilities will use advanced eddy current sensors to recover valuable materials from the 50 million tons of e-waste generated annually.",
      color: "#F59E0B"
    },
    {
      icon: "🔥",
      title: "Induction Heating",
      short: "Industrial Manufacturing",
      tagline: "Heating metal without flame or contact",
      description: "Induction heating revolutionized industrial metalworking by generating heat directly inside the workpiece through eddy currents. A copper coil carrying high-frequency alternating current creates a rapidly oscillating magnetic field. When a metal part is placed inside this coil, powerful eddy currents are induced that heat the material through resistive losses. This contactless heating method is incredibly efficient, precisely controllable, and can reach temperatures exceeding 2,000°C in seconds. From hardening automotive gears to melting precious metals for jewelry casting, induction heating has become indispensable in modern manufacturing.",
      connection: "Our experiment showed how eddy currents convert kinetic energy into heat through electrical resistance. Induction heating exploits this same energy conversion on an industrial scale—instead of motion causing the changing magnetic field, alternating current in a coil creates it, and the resulting eddy currents heat the metal directly.",
      howItWorks: "A power supply converts standard electricity to high-frequency alternating current (typically 10 kHz to 400 kHz). This flows through a water-cooled copper coil, generating an intense oscillating magnetic field. Metal placed in or near the coil experiences rapid magnetic flux changes, inducing powerful eddy currents. The metal's electrical resistance converts these currents to heat. The 'skin effect' concentrates heating at the surface for hardening applications, while lower frequencies penetrate deeper for through-heating.",
      stats: [
        { val: "2,000°C", label: "Maximum achievable temperature" },
        { val: "90%+", label: "Energy efficiency vs. flame" },
        { val: "1-2 sec", label: "Typical heating time" }
      ],
      examples: [
        "Automotive crankshaft and gear hardening",
        "Aerospace turbine blade heat treatment",
        "Precious metal melting for jewelry and dental work",
        "Semiconductor wafer processing"
      ],
      companies: ["Inductotherm", "EFD Induction", "Ajax Tocco", "Ambrell", "GH Induction"],
      futureImpact: "Induction technology is enabling the electrification of traditionally fossil-fuel-powered processes. Steel manufacturers are developing electric induction furnaces powered by renewable energy to produce 'green steel' with near-zero carbon emissions. This shift could eliminate up to 8% of global CO2 emissions currently generated by conventional steelmaking.",
      color: "#10B981"
    },
    {
      icon: "🏥",
      title: "MRI Gradient Coils",
      short: "Medical Imaging",
      tagline: "Seeing inside the body with magnetic precision",
      description: "Magnetic Resonance Imaging (MRI) machines use rapidly switching gradient coils to create detailed 3D images of soft tissues inside the human body. These coils produce precisely controlled magnetic field gradients that vary linearly across the imaging volume, allowing the machine to pinpoint exactly where signals originate. However, the rapid switching of these gradients—up to 1,000 times per second—induces eddy currents in nearby conductive structures. These unwanted currents distort the intended magnetic fields and degrade image quality. Understanding and compensating for eddy currents is crucial for obtaining the sharp, artifact-free images that modern medicine depends on.",
      connection: "Just as our falling magnet induced eddy currents in stationary copper, the changing magnetic fields from MRI gradient coils induce currents in the machine's metal structures. Engineers must carefully design shielding and compensation systems to counteract these effects—turning our simple physics demonstration into a sophisticated medical imaging challenge.",
      howItWorks: "Gradient coils rapidly switch on and off to encode spatial information in the MRI signal. These fast-changing fields induce eddy currents in the cryostat (the superconducting magnet's housing), RF shields, and other conductive components. These parasitic currents create their own magnetic fields that oppose and distort the intended gradients. Modern MRI systems use active shielding (counter-wound coils), pre-emphasis (modified input waveforms), and real-time field monitoring to detect and correct for eddy current effects.",
      stats: [
        { val: "200 T/m/s", label: "Gradient slew rate" },
        { val: "1,000 Hz", label: "Gradient switching frequency" },
        { val: "0.1mm", label: "Achievable spatial resolution" }
      ],
      examples: [
        "Brain functional MRI (fMRI) for neurological research",
        "Cardiac MRI for heart disease diagnosis",
        "Diffusion tensor imaging for nerve fiber mapping",
        "MRI-guided surgery and radiation therapy"
      ],
      companies: ["Siemens Healthineers", "GE Healthcare", "Philips Healthcare", "Canon Medical"],
      futureImpact: "Ultra-high-field MRI machines (7 Tesla and beyond) promise revolutionary imaging detail but face even greater eddy current challenges. New superconducting gradient coil designs and AI-powered real-time compensation algorithms will enable these systems to image individual neurons and early-stage cancers with unprecedented clarity, transforming early disease detection.",
      color: "#8B5CF6"
    }
  ];

  // Phase Renderers
  function renderHookPhase() {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
        {/* Premium badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-emerald-400 tracking-wide">PHYSICS EXPLORATION</span>
        </div>

        {/* Main title with gradient */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-emerald-100 to-teal-200 bg-clip-text text-transparent">
          Eddy Currents
        </h1>

        <p className="text-lg text-slate-400 max-w-md mb-10">
          Discover the invisible currents that fight gravity
        </p>

        {/* Premium card with content */}
        <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 rounded-3xl" />

          <div className="relative">
            <div className="text-6xl mb-6">🧲</div>

            <div className="space-y-4">
              <p className="text-xl text-white/90 font-medium leading-relaxed">
                Drop a magnet through a copper tube - it falls in slow motion!
              </p>
              <p className="text-lg text-slate-400 leading-relaxed">
                No strings, no tricks. What invisible force is fighting gravity?
              </p>
              <div className="pt-2">
                <p className="text-base text-emerald-400 font-semibold">
                  Explore electromagnetic braking and Lenz's Law!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium CTA button */}
        <button
          onClick={() => goToPhase('predict')}
          style={{ zIndex: 10 }}
          className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="relative z-10 flex items-center gap-3">
            Explore Eddy Currents
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>

        {/* Feature hints */}
        <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">✦</span>
            Interactive Lab
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">✦</span>
            Real-World Examples
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">✦</span>
            Knowledge Test
          </div>
        </div>
      </div>
    );
  }

  function renderPredictPhase() {
    const predictions = [
      { id: 'slow', text: "The magnet falls slowly through a copper tube because eddy currents create an opposing magnetic field" },
      { id: 'fast', text: "The magnet falls faster through copper because metal helps it slide" },
      { id: 'same', text: "The magnet falls at the same speed whether copper is present or not" },
      { id: 'stuck', text: "The magnet gets permanently stuck to the copper" },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.md,
          }}>
            🤔 Make Your Prediction
          </h2>
          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
          }}>
            What happens when you drop a magnet through a copper tube?
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: premiumDesign.spacing.md,
          maxWidth: 600,
          margin: '0 auto',
          flex: 1,
        }}>
          {predictions.map((p) => (
            <button
              key={p.id}
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: prediction === p.id
                  ? `2px solid ${premiumDesign.colors.magnet}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: prediction === p.id
                  ? 'rgba(239, 68, 68, 0.2)'
                  : premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                fontSize: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
                zIndex: 10,
              }}
              onClick={() => setPrediction(p.id)}
            >
              {p.text}
            </button>
          ))}
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('hook') },
          {
            text: 'Test My Prediction →',
            onClick: goNext,
            disabled: !prediction,
          }
        )}
      </div>
    );
  }

  function renderPlayPhase() {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <h2 style={{
            fontSize: isMobile ? '20px' : '26px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.sm,
          }}>
            Magnetic Braking Simulator
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Drop the magnet through different materials and observe the braking effect
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.lg,
          flex: 1,
        }}>
          {/* Simulation View */}
          <div style={{
            flex: 2,
            background: premiumDesign.colors.background.card,
            borderRadius: premiumDesign.radius.xl,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <svg viewBox="0 0 280 300" style={{ width: '100%', maxHeight: 350 }}>
              <defs>
                {/* Premium lab background gradient */}
                <linearGradient id="eddyLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#030712" />
                  <stop offset="30%" stopColor="#0a0f1a" />
                  <stop offset="70%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#030712" />
                </linearGradient>

                {/* Copper tube metallic gradient */}
                <linearGradient id="eddyCopperTube" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#92400e" />
                  <stop offset="20%" stopColor="#b45309" />
                  <stop offset="40%" stopColor="#d97706" />
                  <stop offset="60%" stopColor="#b45309" />
                  <stop offset="80%" stopColor="#92400e" />
                  <stop offset="100%" stopColor="#78350f" />
                </linearGradient>

                {/* Aluminum tube metallic gradient */}
                <linearGradient id="eddyAluminumTube" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="20%" stopColor="#94a3b8" />
                  <stop offset="40%" stopColor="#cbd5e1" />
                  <stop offset="60%" stopColor="#94a3b8" />
                  <stop offset="80%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>

                {/* North pole magnet gradient */}
                <linearGradient id="eddyNorthPole" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f87171" />
                  <stop offset="30%" stopColor="#ef4444" />
                  <stop offset="70%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>

                {/* South pole magnet gradient */}
                <linearGradient id="eddySouthPole" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="30%" stopColor="#3b82f6" />
                  <stop offset="70%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>

                {/* Eddy current swirl gradient */}
                <linearGradient id="eddyCurrentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
                  <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#67e8f9" stopOpacity="1" />
                  <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>

                {/* Magnetic field glow gradient */}
                <radialGradient id="eddyMagnetGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
                  <stop offset="40%" stopColor="#7c3aed" stopOpacity="0.3" />
                  <stop offset="70%" stopColor="#6d28d9" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#5b21b6" stopOpacity="0" />
                </radialGradient>

                {/* Braking force indicator gradient */}
                <linearGradient id="eddyBrakeForce" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="#34d399" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0.9" />
                </linearGradient>

                {/* Magnet glow filter */}
                <filter id="eddyMagnetBlur" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Eddy current glow filter */}
                <filter id="eddyCurrentGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Tube inner shadow */}
                <filter id="eddyTubeInnerShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Field line glow */}
                <filter id="eddyFieldGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Premium dark lab background */}
              <rect width="280" height="300" fill="url(#eddyLabBg)" />

              {/* Tube with premium gradients */}
              {conductorType !== 'air' && (
                <>
                  {/* Tube outer glow */}
                  <rect x="98" y="38" width="84" height="224" rx="6"
                    fill={conductorType === 'copper' ? 'rgba(217, 119, 6, 0.2)' : 'rgba(148, 163, 184, 0.2)'}
                    filter="url(#eddyTubeInnerShadow)"
                  />
                  {/* Main tube body */}
                  <rect x="100" y="40" width="80" height="220" rx="5"
                    fill={conductorType === 'copper' ? 'url(#eddyCopperTube)' : 'url(#eddyAluminumTube)'}
                    stroke={conductorType === 'copper' ? '#b45309' : '#94a3b8'}
                    strokeWidth="2"
                    filter="url(#eddyTubeInnerShadow)"
                  />
                  {/* Tube inner hollow */}
                  <rect x="110" y="40" width="60" height="220" rx="3"
                    fill="rgba(0,0,0,0.6)"
                  />
                  {/* Tube highlight */}
                  <rect x="102" y="45" width="8" height="210" rx="2"
                    fill="rgba(255,255,255,0.15)"
                  />
                </>
              )}
              {conductorType === 'air' && (
                <rect x="100" y="40" width="80" height="220" rx="5"
                  fill="transparent"
                  stroke="#475569"
                  strokeWidth="2"
                  strokeDasharray="10,5"
                  opacity="0.5"
                />
              )}

              {/* Swirling eddy current visualization */}
              {conductorType !== 'air' && eddyStrength > 0 && (
                <g filter="url(#eddyCurrentGlow)">
                  {[0, 1, 2, 3].map(i => {
                    const baseOpacity = Math.max(0, 0.8 - i * 0.2) * Math.min(1, eddyStrength / 5);
                    return (
                      <ellipse
                        key={i}
                        cx="140"
                        cy={magnetY + 12}
                        rx={25 + i * 10}
                        ry={4 + i * 2}
                        fill="none"
                        stroke="url(#eddyCurrentGrad)"
                        strokeWidth={3 - i * 0.5}
                        opacity={baseOpacity}
                      >
                        <animate
                          attributeName="stroke-dasharray"
                          values="0,300;150,150;300,0"
                          dur={`${0.4 + i * 0.1}s`}
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="ry"
                          values={`${4 + i * 2};${6 + i * 2};${4 + i * 2}`}
                          dur="0.8s"
                          repeatCount="indefinite"
                        />
                      </ellipse>
                    );
                  })}
                  {/* Eddy current directional arrows */}
                  {[0, 1].map(i => (
                    <g key={`arrow-${i}`} opacity={Math.min(1, eddyStrength / 4)}>
                      <path
                        d={`M ${115 - i * 5} ${magnetY + 12} L ${108 - i * 5} ${magnetY + 8} L ${108 - i * 5} ${magnetY + 16} Z`}
                        fill="#22d3ee"
                      >
                        <animate
                          attributeName="opacity"
                          values="0.8;0.3;0.8"
                          dur="0.5s"
                          repeatCount="indefinite"
                        />
                      </path>
                      <path
                        d={`M ${165 + i * 5} ${magnetY + 12} L ${172 + i * 5} ${magnetY + 16} L ${172 + i * 5} ${magnetY + 8} Z`}
                        fill="#22d3ee"
                      >
                        <animate
                          attributeName="opacity"
                          values="0.3;0.8;0.3"
                          dur="0.5s"
                          repeatCount="indefinite"
                        />
                      </path>
                    </g>
                  ))}
                </g>
              )}

              {/* Magnet with premium gradients and glow */}
              <g transform={`translate(140, ${magnetY})`} filter="url(#eddyMagnetBlur)">
                {/* Magnetic field aura */}
                <ellipse cx="0" cy="0" rx="35" ry="25" fill="url(#eddyMagnetGlow)" />

                {/* North pole with gradient */}
                <rect x="-15" y="-15" width="30" height="15" fill="url(#eddyNorthPole)" stroke="#991b1b" strokeWidth="1" rx="3" />
                <text x="0" y="-4" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">N</text>

                {/* South pole with gradient */}
                <rect x="-15" y="0" width="30" height="15" fill="url(#eddySouthPole)" stroke="#1e40af" strokeWidth="1" rx="3" />
                <text x="0" y="11" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">S</text>

                {/* Premium magnetic field lines with glow */}
                <g filter="url(#eddyFieldGlow)" opacity="0.7">
                  <path d="M -18 -15 Q -40 0 -18 15" fill="none" stroke="#c4b5fd" strokeWidth="1.5" />
                  <path d="M -22 -12 Q -48 0 -22 12" fill="none" stroke="#a78bfa" strokeWidth="1" opacity="0.6" />
                  <path d="M 18 -15 Q 40 0 18 15" fill="none" stroke="#c4b5fd" strokeWidth="1.5" />
                  <path d="M 22 -12 Q 48 0 22 12" fill="none" stroke="#a78bfa" strokeWidth="1" opacity="0.6" />
                  {/* Top field lines */}
                  <path d="M -10 -17 Q -10 -30 0 -30 Q 10 -30 10 -17" fill="none" stroke="#ddd6fe" strokeWidth="1" opacity="0.5" />
                  {/* Bottom field lines */}
                  <path d="M -10 17 Q -10 30 0 30 Q 10 30 10 17" fill="none" stroke="#ddd6fe" strokeWidth="1" opacity="0.5" />
                </g>
              </g>

              {/* Braking effect visualization (upward force arrow) */}
              {conductorType !== 'air' && eddyStrength > 0.5 && (
                <g opacity={Math.min(1, eddyStrength / 3)}>
                  <path
                    d={`M 140 ${magnetY + 25} L 140 ${magnetY + 45}`}
                    stroke="url(#eddyBrakeForce)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M 134 ${magnetY + 33} L 140 ${magnetY + 25} L 146 ${magnetY + 33}`}
                    fill="none"
                    stroke="#6ee7b7"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <animate
                      attributeName="opacity"
                      values="1;0.5;1"
                      dur="0.4s"
                      repeatCount="indefinite"
                    />
                  </path>
                </g>
              )}

              {/* Start position marker */}
              <line x1="80" y1="50" x2="95" y2="50" stroke="#64748b" strokeWidth="1.5" />
            </svg>

            {/* Labels outside SVG using typo system */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: typo.elementGap,
              padding: `0 ${typo.cardPadding}`
            }}>
              <span style={{
                fontSize: typo.small,
                color: premiumDesign.colors.text.muted
              }}>
                Start
              </span>
              <span style={{
                fontSize: typo.body,
                color: premiumDesign.colors.text.primary,
                fontWeight: 600
              }}>
                {conductorType.charAt(0).toUpperCase() + conductorType.slice(1)} {conductorType !== 'air' ? 'Tube' : '(No tube)'}
              </span>
            </div>

            {/* Data display outside SVG */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
              marginTop: typo.elementGap,
              padding: typo.cardPadding,
              background: premiumDesign.colors.background.tertiary,
              borderRadius: premiumDesign.radius.md,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: typo.small, color: premiumDesign.colors.text.muted }}>Speed</div>
                <div style={{ fontSize: typo.bodyLarge, color: premiumDesign.colors.magnet, fontWeight: 700 }}>
                  {magnetVelocity.toFixed(1)} m/s
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: typo.small, color: premiumDesign.colors.text.muted }}>Eddy Force</div>
                <div style={{ fontSize: typo.bodyLarge, color: premiumDesign.colors.eddy, fontWeight: 700 }}>
                  {(eddyStrength * conductivity[conductorType]).toFixed(1)} N
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.md }}>
                Material
              </h4>
              {(['copper', 'aluminum', 'air'] as const).map(type => (
                <button
                  key={type}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: premiumDesign.spacing.sm,
                    marginBottom: premiumDesign.spacing.xs,
                    borderRadius: premiumDesign.radius.md,
                    border: conductorType === type ? `2px solid ${premiumDesign.colors.magnet}` : '1px solid rgba(255,255,255,0.1)',
                    background: conductorType === type ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: premiumDesign.colors.text.primary,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    textAlign: 'left',
                    zIndex: 10,
                  }}
                  onClick={() => {
                    setConductorType(type);
                    resetMagnet();
                  }}
                >
                  {type === 'air' ? '🌬️ Air (no tube)' : type === 'copper' ? '🟤 Copper tube' : '⚪ Aluminum tube'}
                  <span style={{ float: 'right', color: premiumDesign.colors.text.muted }}>
                    σ = {conductivity[type]}
                  </span>
                </button>
              ))}
            </div>

            {renderButton(
              isDropping ? '⏸ Dropping...' : '🧲 Drop Magnet',
              () => {
                resetMagnet();
                setTimeout(() => setIsDropping(true), 100);
              },
              isDropping ? 'secondary' : 'success'
            )}

            <button
              style={{
                padding: premiumDesign.spacing.md,
                borderRadius: premiumDesign.radius.md,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: premiumDesign.colors.text.secondary,
                cursor: 'pointer',
                zIndex: 10,
              }}
              onClick={() => resetMagnet()}
            >
              🔄 Reset
            </button>

            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '14px', margin: 0 }}>
                💡 Compare copper vs air - notice how eddy currents create a magnetic braking force!
              </p>
            </div>
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('predict') },
          { text: 'Review Results →', onClick: goNext }
        )}
      </div>
    );
  }

  function renderReviewPhase() {
    const reviewContent = [
      {
        title: "Faraday's Law of Induction",
        content: "When a magnetic field changes near a conductor, it induces an electromotive force (EMF) that drives current through the conductor. Moving a magnet creates a changing field in nearby metal.",
        formula: "EMF = -dΦ/dt (rate of change of magnetic flux)",
      },
      {
        title: "Eddy Currents Form",
        content: "The induced EMF drives circular currents (eddy currents) that swirl through the conductor. These are called 'eddy' because they circulate like eddies in water.",
        formula: "I_eddy ∝ dΦ/dt × σ (conductivity)",
      },
      {
        title: "Lenz's Law: Opposition",
        content: "The eddy currents create their own magnetic field that OPPOSES the change that created them. If the magnet is falling, the eddy field pushes up against it - magnetic braking!",
        formula: "B_induced opposes change → Braking force",
      },
      {
        title: "Your Prediction",
        content: prediction === 'slow'
          ? "Excellent! You correctly predicted that eddy currents create an opposing magnetic field that slows the magnet's fall."
          : "The correct answer is that eddy currents create an opposing magnetic field. This electromagnetic braking slows the magnet significantly.",
        formula: "Nature resists change (Lenz's Law)",
      },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            📊 Understanding Eddy Currents
          </h2>
        </div>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            color: premiumDesign.colors.magnet,
            fontSize: '20px',
            marginBottom: premiumDesign.spacing.md,
          }}>
            {reviewContent[reviewStep].title}
          </h3>

          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
            lineHeight: 1.7,
            marginBottom: premiumDesign.spacing.lg,
          }}>
            {reviewContent[reviewStep].content}
          </p>

          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: premiumDesign.radius.md,
            padding: premiumDesign.spacing.md,
            fontFamily: 'monospace',
            color: premiumDesign.colors.magnet,
            textAlign: 'center',
          }}>
            {reviewContent[reviewStep].formula}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: premiumDesign.spacing.sm,
            marginTop: premiumDesign.spacing.xl,
          }}>
            {reviewContent.map((_, i) => (
              <button
                key={i}
                style={{
                  width: 40,
                  height: 8,
                  borderRadius: premiumDesign.radius.full,
                  border: 'none',
                  background: i === reviewStep
                    ? premiumDesign.colors.magnet
                    : premiumDesign.colors.background.tertiary,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  zIndex: 10,
                }}
                onClick={() => setReviewStep(i)}
              />
            ))}
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('play') },
          {
            text: reviewStep < reviewContent.length - 1 ? 'Continue →' : 'Try a Twist →',
            onClick: () => {
              if (reviewStep < reviewContent.length - 1) {
                setReviewStep(r => r + 1);
              } else {
                goNext();
              }
            },
          }
        )}
      </div>
    );
  }

  function renderTwistPredictPhase() {
    const twistPredictions = [
      { id: 'faster', text: "The pendulum swings faster when passing through the magnetic field" },
      { id: 'slower', text: "The pendulum slows down and stops sooner due to eddy current damping" },
      { id: 'same', text: "The magnetic field has no effect on the pendulum's motion" },
      { id: 'stuck', text: "The pendulum gets stuck in the magnetic field" },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.md,
          }}>
            🔄 The Twist: Pendulum Damping
          </h2>
          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
          }}>
            What happens when a copper pendulum swings through a magnetic field?
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: premiumDesign.spacing.md,
          maxWidth: 600,
          margin: '0 auto',
          flex: 1,
        }}>
          {twistPredictions.map((p) => (
            <button
              key={p.id}
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: twistPrediction === p.id
                  ? `2px solid ${premiumDesign.colors.secondary}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: twistPrediction === p.id
                  ? 'rgba(139, 92, 246, 0.2)'
                  : premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                fontSize: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
                zIndex: 10,
              }}
              onClick={() => setTwistPrediction(p.id)}
            >
              {p.text}
            </button>
          ))}
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('review') },
          {
            text: 'Test My Prediction →',
            onClick: () => {
              resetPendulum();
              goNext();
            },
            disabled: !twistPrediction,
          }
        )}
      </div>
    );
  }

  function renderTwistPlayPhase() {
    const pendulumLength = 100;
    const pivotX = 140;
    const pivotY = 60;
    const bobX = pivotX + pendulumLength * Math.sin(pendulumAngle * Math.PI / 180);
    const bobY = pivotY + pendulumLength * Math.cos(pendulumAngle * Math.PI / 180);

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <h2 style={{
            fontSize: isMobile ? '20px' : '26px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.sm,
          }}>
            Electromagnetic Damping
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Compare pendulum motion with and without magnetic damping
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.lg,
          flex: 1,
        }}>
          {/* Pendulum View */}
          <div style={{
            flex: 2,
            background: premiumDesign.colors.background.card,
            borderRadius: premiumDesign.radius.xl,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <svg viewBox="0 0 280 250" style={{ width: '100%', maxHeight: 280 }}>
              <defs>
                {/* Pendulum lab background */}
                <linearGradient id="eddyPendulumBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#030712" />
                  <stop offset="30%" stopColor="#0a0f1a" />
                  <stop offset="70%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#030712" />
                </linearGradient>

                {/* Support beam metallic gradient */}
                <linearGradient id="eddySupportBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#374151" />
                  <stop offset="25%" stopColor="#4b5563" />
                  <stop offset="50%" stopColor="#6b7280" />
                  <stop offset="75%" stopColor="#4b5563" />
                  <stop offset="100%" stopColor="#374151" />
                </linearGradient>

                {/* Pendulum rod gradient */}
                <linearGradient id="eddyPendulumRod" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6b7280" />
                  <stop offset="50%" stopColor="#9ca3af" />
                  <stop offset="100%" stopColor="#6b7280" />
                </linearGradient>

                {/* Copper bob gradient */}
                <linearGradient id="eddyCopperBob" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d97706" />
                  <stop offset="25%" stopColor="#f59e0b" />
                  <stop offset="50%" stopColor="#fbbf24" />
                  <stop offset="75%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>

                {/* Magnet housing gradient */}
                <linearGradient id="eddyMagnetHousing" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#374151" />
                  <stop offset="20%" stopColor="#4b5563" />
                  <stop offset="50%" stopColor="#6b7280" />
                  <stop offset="80%" stopColor="#4b5563" />
                  <stop offset="100%" stopColor="#374151" />
                </linearGradient>

                {/* North pole gradient for pendulum magnet */}
                <linearGradient id="eddyPendNorth" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f87171" />
                  <stop offset="50%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>

                {/* South pole gradient for pendulum magnet */}
                <linearGradient id="eddyPendSouth" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>

                {/* Eddy current swirl in bob */}
                <radialGradient id="eddyBobSwirl" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
                  <stop offset="40%" stopColor="#06b6d4" stopOpacity="0.6" />
                  <stop offset="70%" stopColor="#0891b2" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#0e7490" stopOpacity="0" />
                </radialGradient>

                {/* Magnetic field between poles */}
                <linearGradient id="eddyFieldBetween" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#a855f7" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
                </linearGradient>

                {/* Pivot glow */}
                <radialGradient id="eddyPivotGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#9ca3af" />
                  <stop offset="60%" stopColor="#6b7280" />
                  <stop offset="100%" stopColor="#4b5563" />
                </radialGradient>

                {/* Pendulum eddy glow filter */}
                <filter id="eddyPendulumGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Bob metallic filter */}
                <filter id="eddyBobShine" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Magnet field glow */}
                <filter id="eddyMagnetFieldGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Premium dark lab background */}
              <rect width="280" height="250" fill="url(#eddyPendulumBg)" />

              {/* Support structure with premium metallic look */}
              <rect x="100" y="20" width="80" height="12" fill="url(#eddySupportBeam)" rx="3" />
              <rect x="101" y="21" width="78" height="3" fill="rgba(255,255,255,0.1)" rx="1" />
              <rect x="133" y="32" width="14" height="33" fill="url(#eddySupportBeam)" rx="2" />
              <rect x="134" y="33" width="4" height="30" fill="rgba(255,255,255,0.08)" rx="1" />

              {/* Magnet assembly (optional) with premium gradients */}
              {dampingEnabled && (
                <g transform="translate(120, 145)">
                  {/* Magnetic field visualization between poles */}
                  <rect x="17" y="5" width="6" height="50" fill="url(#eddyFieldBetween)" filter="url(#eddyMagnetFieldGlow)" opacity="0.6">
                    <animate
                      attributeName="opacity"
                      values="0.4;0.7;0.4"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </rect>

                  {/* Magnet housing */}
                  <rect x="0" y="0" width="40" height="60" fill="url(#eddyMagnetHousing)" stroke="#6b7280" strokeWidth="1.5" rx="4" />
                  <rect x="1" y="1" width="38" height="8" fill="rgba(255,255,255,0.1)" rx="3" />

                  {/* North pole with gradient */}
                  <rect x="5" y="5" width="12" height="50" fill="url(#eddyPendNorth)" rx="2" />
                  <rect x="6" y="6" width="3" height="48" fill="rgba(255,255,255,0.2)" rx="1" />

                  {/* South pole with gradient */}
                  <rect x="23" y="5" width="12" height="50" fill="url(#eddyPendSouth)" rx="2" />
                  <rect x="24" y="6" width="3" height="48" fill="rgba(255,255,255,0.2)" rx="1" />

                  {/* Pole labels */}
                  <text x="11" y="32" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">N</text>
                  <text x="29" y="32" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">S</text>
                </g>
              )}

              {/* Pendulum rod with gradient */}
              <line
                x1={pivotX}
                y1={pivotY}
                x2={bobX}
                y2={bobY}
                stroke="url(#eddyPendulumRod)"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Pivot point with premium look */}
              <circle cx={pivotX} cy={pivotY} r="7" fill="url(#eddyPivotGlow)" stroke="#9ca3af" strokeWidth="1" />
              <circle cx={pivotX - 2} cy={pivotY - 2} r="2" fill="rgba(255,255,255,0.3)" />

              {/* Copper bob with premium metallic gradient */}
              <g transform={`rotate(${pendulumAngle}, ${bobX}, ${bobY})`} filter="url(#eddyBobShine)">
                <rect
                  x={bobX - 15}
                  y={bobY - 5}
                  width="30"
                  height="35"
                  fill="url(#eddyCopperBob)"
                  stroke="#92400e"
                  strokeWidth="1.5"
                  rx="4"
                />
                {/* Highlight on copper */}
                <rect
                  x={bobX - 13}
                  y={bobY - 3}
                  width="6"
                  height="31"
                  fill="rgba(255,255,255,0.15)"
                  rx="2"
                />
              </g>

              {/* Premium eddy current visualization when passing through magnet */}
              {dampingEnabled && Math.abs(pendulumAngle) < 30 && Math.abs(pendulumVelocity) > 0.5 && (
                <g filter="url(#eddyPendulumGlow)">
                  {/* Glowing eddy swirls in the bob */}
                  {[0, 1, 2].map(i => {
                    const intensity = Math.min(1, Math.abs(pendulumVelocity) / 3);
                    return (
                      <ellipse
                        key={i}
                        cx={bobX}
                        cy={bobY + 12}
                        rx={8 + i * 6}
                        ry={3 + i * 1.5}
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth={2.5 - i * 0.5}
                        opacity={(0.9 - i * 0.25) * intensity}
                      >
                        <animate
                          attributeName="stroke-dasharray"
                          values="0,100;50,50;100,0"
                          dur={`${0.3 + i * 0.1}s`}
                          repeatCount="indefinite"
                        />
                      </ellipse>
                    );
                  })}

                  {/* Central glow spot */}
                  <circle
                    cx={bobX}
                    cy={bobY + 12}
                    r="5"
                    fill="url(#eddyBobSwirl)"
                    opacity={Math.min(1, Math.abs(pendulumVelocity) / 2)}
                  >
                    <animate
                      attributeName="r"
                      values="4;6;4"
                      dur="0.4s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              )}
            </svg>

            {/* Labels outside SVG using typo system */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
              marginTop: typo.elementGap,
              padding: typo.cardPadding,
              background: premiumDesign.colors.background.tertiary,
              borderRadius: premiumDesign.radius.md,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: typo.small, color: premiumDesign.colors.text.muted }}>Swings</div>
                <div style={{ fontSize: typo.heading, color: premiumDesign.colors.secondary, fontWeight: 700 }}>
                  {swingCount}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: typo.small, color: premiumDesign.colors.text.muted }}>Angle</div>
                <div style={{ fontSize: typo.bodyLarge, color: premiumDesign.colors.text.primary, fontWeight: 600 }}>
                  {pendulumAngle.toFixed(1)}°
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: premiumDesign.spacing.sm,
                color: premiumDesign.colors.text.primary,
                cursor: 'pointer',
                fontSize: '16px',
              }}>
                <input
                  type="checkbox"
                  checked={dampingEnabled}
                  onChange={(e) => {
                    setDampingEnabled(e.target.checked);
                    resetPendulum();
                  }}
                  style={{
                    width: 20,
                    height: 20,
                    accentColor: premiumDesign.colors.secondary,
                  }}
                />
                🧲 Enable Magnetic Damping
              </label>
              <p style={{ color: premiumDesign.colors.text.muted, fontSize: '12px', marginTop: premiumDesign.spacing.sm }}>
                {dampingEnabled
                  ? "Magnet creates eddy currents in the copper bob, dissipating energy as heat"
                  : "No magnetic field - pendulum swings with minimal damping"}
              </p>
            </div>

            {renderButton(
              isPendulumRunning ? '⏸ Pause' : '▶️ Start Pendulum',
              () => {
                if (!isPendulumRunning) {
                  setIsPendulumRunning(true);
                } else {
                  setIsPendulumRunning(false);
                }
              },
              isPendulumRunning ? 'secondary' : 'success'
            )}

            <button
              style={{
                padding: premiumDesign.spacing.md,
                borderRadius: premiumDesign.radius.md,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: premiumDesign.colors.text.secondary,
                cursor: 'pointer',
                zIndex: 10,
              }}
              onClick={() => resetPendulum()}
            >
              🔄 Reset
            </button>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '12px' }}>
                Total Swings Before Stopping
              </div>
              <div style={{ color: premiumDesign.colors.secondary, fontSize: '28px', fontWeight: 700 }}>
                {swingCount}
              </div>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '14px', margin: 0 }}>
                💡 Run with and without damping - notice how the magnet dramatically reduces swing count!
              </p>
            </div>
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('twist_predict') },
          { text: 'Review Results →', onClick: goNext }
        )}
      </div>
    );
  }

  function renderTwistReviewPhase() {
    const twistReviewContent = [
      {
        title: "Eddy Current Damping",
        content: "When the copper bob passes through the magnetic field, eddy currents are induced. These currents dissipate energy as heat in the copper, rapidly removing kinetic energy from the swing.",
        highlight: twistPrediction === 'slower'
          ? "You correctly predicted that eddy currents would slow the pendulum!"
          : "The correct answer is that eddy currents dissipate energy as heat, causing the pendulum to stop much sooner.",
      },
      {
        title: "Energy Conversion",
        content: "The kinetic energy of the swinging pendulum isn't destroyed - it's converted to heat through electrical resistance. This is exactly how electromagnetic brakes work in trains and roller coasters!",
      },
      {
        title: "Braking Without Contact",
        content: "Unlike friction brakes that wear out, electromagnetic damping has no physical contact. The copper never touches the magnet, yet is strongly braked by the induced currents. This makes eddy current brakes extremely durable.",
      },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            🔍 Damping Analysis
          </h2>
        </div>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            color: premiumDesign.colors.secondary,
            fontSize: '20px',
            marginBottom: premiumDesign.spacing.md,
          }}>
            {twistReviewContent[twistReviewStep].title}
          </h3>

          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
            lineHeight: 1.7,
            marginBottom: premiumDesign.spacing.md,
          }}>
            {twistReviewContent[twistReviewStep].content}
          </p>

          {twistReviewContent[twistReviewStep].highlight && (
            <div style={{
              background: twistPrediction === 'slower'
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(239, 68, 68, 0.2)',
              borderRadius: premiumDesign.radius.md,
              padding: premiumDesign.spacing.md,
              marginTop: premiumDesign.spacing.md,
              border: `1px solid ${twistPrediction === 'slower' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
            }}>
              <p style={{
                color: twistPrediction === 'slower' ? premiumDesign.colors.success : '#EF4444',
                margin: 0
              }}>
                {twistReviewContent[twistReviewStep].highlight}
              </p>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: premiumDesign.spacing.sm,
            marginTop: premiumDesign.spacing.xl,
          }}>
            {twistReviewContent.map((_, i) => (
              <button
                key={i}
                style={{
                  width: 40,
                  height: 8,
                  borderRadius: premiumDesign.radius.full,
                  border: 'none',
                  background: i === twistReviewStep
                    ? premiumDesign.colors.secondary
                    : premiumDesign.colors.background.tertiary,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  zIndex: 10,
                }}
                onClick={() => setTwistReviewStep(i)}
              />
            ))}
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('twist_play') },
          {
            text: twistReviewStep < twistReviewContent.length - 1 ? 'Continue →' : 'Real-World Examples →',
            onClick: () => {
              if (twistReviewStep < twistReviewContent.length - 1) {
                setTwistReviewStep(t => t + 1);
              } else {
                goNext();
              }
            },
          }
        )}
      </div>
    );
  }

  function renderTransferPhase() {
    const applications = [
      {
        title: "🎢 Roller Coaster Brakes",
        description: "Many roller coasters use magnetic braking systems. Metal fins on the coaster pass through powerful magnets, inducing eddy currents that safely slow the train - no friction, no wear, highly reliable!",
        fact: "Some roller coaster magnetic brakes can stop a train from 60 mph in just 2-3 seconds without any contact!",
      },
      {
        title: "🚄 Maglev Trains",
        description: "High-speed maglev trains use eddy current braking as part of their braking system. At high speeds, electromagnetic braking is more effective than mechanical brakes and doesn't produce brake dust.",
        fact: "The Japanese L0 Series maglev reached 374 mph (603 km/h), using electromagnetic systems for both propulsion and braking!",
      },
      {
        title: "🍳 Induction Cooktops",
        description: "Induction stoves use rapidly changing magnetic fields to induce eddy currents directly in your cookware. The pan becomes the heating element! This is more efficient than traditional electric or gas cooking.",
        fact: "Induction cooking is about 90% efficient - compared to 40% for gas and 70% for electric resistance!",
      },
      {
        title: "🔍 Metal Detectors",
        description: "Metal detectors work by inducing eddy currents in nearby metal objects. These currents create their own magnetic field that the detector senses, allowing it to find buried treasure (or your lost keys)!",
        fact: "Airport metal detectors can distinguish between different metals based on their unique eddy current 'signatures'!",
      },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.sm,
          }}>
            🌍 Eddy Currents in Action
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Explore all {applications.length} applications to unlock the quiz
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: premiumDesign.spacing.sm,
          marginBottom: premiumDesign.spacing.lg,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {applications.map((app, index) => (
            <button
              key={index}
              style={{
                padding: `${premiumDesign.spacing.sm}px ${premiumDesign.spacing.md}px`,
                borderRadius: premiumDesign.radius.full,
                border: activeApp === index
                  ? `2px solid ${premiumDesign.colors.magnet}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: activeApp === index
                  ? 'rgba(239, 68, 68, 0.2)'
                  : completedApps.has(index)
                    ? 'rgba(16, 185, 129, 0.2)'
                    : premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                zIndex: 10,
              }}
              onClick={() => setActiveApp(index)}
            >
              {completedApps.has(index) && '✓ '}{app.title.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Application Content */}
        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            fontSize: '22px',
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.md,
          }}>
            {applications[activeApp].title}
          </h3>

          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
            lineHeight: 1.7,
            marginBottom: premiumDesign.spacing.lg,
          }}>
            {applications[activeApp].description}
          </p>

          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: premiumDesign.radius.lg,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}>
            <p style={{ margin: 0, color: premiumDesign.colors.magnet, fontWeight: 600 }}>
              💡 Fun Fact
            </p>
            <p style={{ margin: `${premiumDesign.spacing.sm}px 0 0`, color: premiumDesign.colors.text.secondary }}>
              {applications[activeApp].fact}
            </p>
          </div>

          {/* Next Application button */}
          <button
            style={{
              display: 'block',
              width: '100%',
              marginTop: premiumDesign.spacing.lg,
              padding: premiumDesign.spacing.md,
              borderRadius: premiumDesign.radius.md,
              border: 'none',
              background: premiumDesign.colors.gradient.primary,
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              zIndex: 10,
            }}
            onClick={() => {
              const newCompleted = new Set(completedApps);
              newCompleted.add(activeApp);
              setCompletedApps(newCompleted);
              if (activeApp < applications.length - 1) {
                setActiveApp(activeApp + 1);
              }
            }}
          >
            {activeApp < applications.length - 1 ? 'Next Application →' : (completedApps.has(activeApp) ? '✓ Completed' : '✓ Mark as Read')}
          </button>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: premiumDesign.spacing.lg,
          color: premiumDesign.colors.text.muted,
        }}>
          {completedApps.size} of {applications.length} applications explored
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('twist_review') },
          {
            text: completedApps.size === applications.length ? 'Take the Quiz →' : `Explore ${applications.length - completedApps.size} More →`,
            onClick: goNext,
            disabled: completedApps.size < applications.length,
          }
        )}
      </div>
    );
  }

  function renderTestPhase() {
    const question = testQuestions[currentQuestion];

    if (testComplete) {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      const passed = percentage >= 70;

      return (
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
          {renderProgressBar()}

          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '72px', marginBottom: premiumDesign.spacing.lg }}>
              {passed ? '🎉' : '📚'}
            </div>

            <h2 style={{
              fontSize: isMobile ? '28px' : '36px',
              fontWeight: 700,
              color: premiumDesign.colors.text.primary,
              marginBottom: premiumDesign.spacing.md,
            }}>
              {passed ? 'Excellent Work!' : 'Keep Learning!'}
            </h2>

            <div style={{
              fontSize: '48px',
              fontWeight: 700,
              background: passed ? premiumDesign.colors.gradient.eddy : 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: premiumDesign.spacing.md,
            }}>
              {testScore}/{testQuestions.length}
            </div>

            <p style={{
              color: premiumDesign.colors.text.secondary,
              fontSize: '18px',
              marginBottom: premiumDesign.spacing.xl,
            }}>
              {passed
                ? 'You have mastered eddy currents!'
                : 'Review the material and try again.'}
            </p>

            {renderButton(
              passed ? 'Continue to Mastery →' : 'Review Material',
              () => {
                if (passed) {
                  goNext();
                } else {
                  setTestComplete(false);
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('review');
                }
              },
              passed ? 'success' : 'primary'
            )}
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          <span style={{ color: premiumDesign.colors.text.muted }}>
            Question {currentQuestion + 1} of {testQuestions.length}
          </span>
          <span style={{ color: premiumDesign.colors.magnet, fontWeight: 600 }}>
            Score: {testScore}
          </span>
        </div>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            fontSize: isMobile ? '18px' : '22px',
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.xl,
            lineHeight: 1.5,
          }}>
            {question.question}
          </h3>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            {question.options.map((option, index) => {
              let buttonStyle: React.CSSProperties = {
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: '2px solid rgba(255,255,255,0.1)',
                background: premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                fontSize: '16px',
                cursor: showExplanation ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
                zIndex: 10,
              };

              if (showExplanation) {
                if (option.correct) {
                  buttonStyle.background = 'rgba(16, 185, 129, 0.2)';
                  buttonStyle.borderColor = premiumDesign.colors.success;
                } else if (index === selectedAnswer && !option.correct) {
                  buttonStyle.background = 'rgba(239, 68, 68, 0.2)';
                  buttonStyle.borderColor = '#EF4444';
                }
              } else if (selectedAnswer === index) {
                buttonStyle.borderColor = premiumDesign.colors.magnet;
                buttonStyle.background = 'rgba(239, 68, 68, 0.2)';
              }

              return (
                <button
                  key={index}
                  style={buttonStyle}
                  onClick={() => {
                    if (!showExplanation) {
                      setSelectedAnswer(index);
                    }
                  }}
                  disabled={showExplanation}
                >
                  {option.text}
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div style={{
              marginTop: premiumDesign.spacing.xl,
              padding: premiumDesign.spacing.lg,
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.magnet, fontWeight: 600, marginBottom: premiumDesign.spacing.sm }}>
                Explanation:
              </p>
              <p style={{ color: premiumDesign.colors.text.secondary, margin: 0 }}>
                {question.explanation}
              </p>
            </div>
          )}
        </div>

        <div style={{ marginTop: premiumDesign.spacing.xl, display: 'flex', justifyContent: 'flex-end' }}>
          {!showExplanation ? (
            renderButton(
              'Check Answer',
              () => {
                setShowExplanation(true);
                if (question.options[selectedAnswer as number]?.correct) {
                  setTestScore(s => s + 1);
                }
              },
              'primary',
              selectedAnswer === null
            )
          ) : (
            renderButton(
              currentQuestion < testQuestions.length - 1 ? 'Next Question →' : 'See Results',
              () => {
                if (currentQuestion < testQuestions.length - 1) {
                  setCurrentQuestion(c => c + 1);
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                } else {
                  setTestComplete(true);
                }
              },
              'primary'
            )
          )}
        </div>
      </div>
    );
  }

  function renderMasteryPhase() {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: premiumDesign.spacing.xl,
      }}>
        <div style={{
          fontSize: '80px',
          marginBottom: premiumDesign.spacing.xl,
        }}>
          🏆
        </div>

        <h1 style={{
          fontSize: isMobile ? '32px' : '42px',
          fontWeight: 700,
          background: premiumDesign.colors.gradient.eddy,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          Eddy Currents Master!
        </h1>

        <p style={{
          fontSize: '18px',
          color: premiumDesign.colors.text.secondary,
          maxWidth: 500,
          lineHeight: 1.7,
          marginBottom: premiumDesign.spacing.xl,
        }}>
          You now understand how changing magnetic fields induce currents in conductors, and how Lenz's Law creates opposing forces useful for braking and damping!
        </p>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: 500,
          width: '100%',
          marginBottom: premiumDesign.spacing.xl,
        }}>
          <h3 style={{ color: premiumDesign.colors.magnet, marginBottom: premiumDesign.spacing.md }}>
            Key Concepts Mastered
          </h3>
          <ul style={{
            textAlign: 'left',
            color: premiumDesign.colors.text.secondary,
            lineHeight: 2,
            paddingLeft: premiumDesign.spacing.lg,
          }}>
            <li>Faraday's Law: Changing B induces EMF</li>
            <li>Eddy currents swirl in conductors</li>
            <li>Lenz's Law: Induced field opposes change</li>
            <li>Kinetic energy → Heat via resistance</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: premiumDesign.spacing.md, flexWrap: 'wrap', justifyContent: 'center' }}>
          {renderButton('← Review Again', () => goToPhase('hook'), 'secondary')}
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Eddy Currents</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-emerald-400 w-6 shadow-lg shadow-emerald-400/30'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-emerald-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12 max-w-4xl mx-auto px-4">
        {phase === 'hook' && renderHookPhase()}
        {phase === 'predict' && renderPredictPhase()}
        {phase === 'play' && renderPlayPhase()}
        {phase === 'review' && renderReviewPhase()}
        {phase === 'twist_predict' && renderTwistPredictPhase()}
        {phase === 'twist_play' && renderTwistPlayPhase()}
        {phase === 'twist_review' && renderTwistReviewPhase()}
        {phase === 'transfer' && renderTransferPhase()}
        {phase === 'test' && renderTestPhase()}
        {phase === 'mastery' && renderMasteryPhase()}
      </div>
    </div>
  );
}
