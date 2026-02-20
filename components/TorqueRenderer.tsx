'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TORQUE - Premium 10-Phase Educational Game
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Play',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Play',
  twist_review: 'Twist Review',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery'
};

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications with full stats
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🔧',
    title: 'Torque Wrenches',
    short: 'Precision tightening for critical fasteners',
    tagline: 'When too tight or too loose means failure',
    description: 'Torque wrenches ensure bolts are tightened to exact specifications. Under-torqued bolts loosen and fail; over-torqued bolts strip threads or break. Critical in automotive, aerospace, and construction.',
    connection: 'The wrench handle is the lever arm, and the force you apply creates torque. Click-type wrenches release when target torque is reached.',
    howItWorks: 'A calibrated spring or electronic sensor measures torque. The longer the handle, the less force needed for the same torque. Digital wrenches display real-time readings.',
    stats: [
      { value: '±4%', label: 'Wrench accuracy', icon: '🎯' },
      { value: '500Nm', label: 'Lug nut torque', icon: '🔩' },
      { value: '1%', label: 'Aerospace tolerance', icon: '✈️' }
    ],
    examples: ['Wheel lug nuts', 'Engine head bolts', 'Aircraft fasteners', 'Bridge bolts'],
    companies: ['Snap-on', 'Proto', 'CDI', 'Norbar'],
    futureImpact: 'Smart bolts with embedded sensors will confirm proper torque and detect loosening over time.',
    color: '#3B82F6'
  },
  {
    icon: '🚴',
    title: 'Bicycle Gear Systems',
    short: 'Multiplying force through the drivetrain',
    tagline: 'Turning leg power into speed',
    description: 'Bicycle gears trade pedaling speed for force multiplication. Small chainrings increase torque for climbing; large ones increase speed for flats. The crankset is a lever arm for your legs.',
    connection: 'Pedal force times crank length equals input torque. Gear ratios multiply or divide this torque before it reaches the wheel.',
    howItWorks: 'Torque = force x crank length. A 170mm crank with 100N force produces 17Nm. A 1:2 gear ratio doubles the torque at the wheel but halves the rotation speed.',
    stats: [
      { value: '165-175mm', label: 'Typical crank length', icon: '📏' },
      { value: '1:4', label: 'Climbing gear ratio', icon: '⛰️' },
      { value: '4:1', label: 'Sprint gear ratio', icon: '🏎️' }
    ],
    examples: ['Road bikes', 'Mountain bikes', 'E-bikes', 'Track cycling'],
    companies: ['Shimano', 'SRAM', 'Campagnolo', 'FSA'],
    futureImpact: 'Electronic shifting with AI will automatically optimize gear ratios based on terrain and rider fatigue.',
    color: '#10B981'
  },
  {
    icon: '🏗️',
    title: 'Crane Moment Ratings',
    short: 'Understanding lifting capacity limits',
    tagline: 'Load times distance equals danger',
    description: 'Crane capacity drops dramatically with boom length and angle. A 100-ton crane might only lift 10 tons at full extension. Operators must constantly calculate moments to prevent tipping.',
    connection: 'The load creates a tipping moment about the crane base. This moment (force x distance) must never exceed the counterweight moment.',
    howItWorks: 'Load charts show maximum weight at each radius. Moment limiters cut power if limits approach. Counterweights balance the load moment. Longer boom = smaller capacity.',
    stats: [
      { value: '10x', label: 'Capacity reduction at full reach', icon: '📉' },
      { value: '85%', label: 'Crane accidents from overload', icon: '⚠️' },
      { value: '1000t', label: 'Max mobile crane capacity', icon: '🏗️' }
    ],
    examples: ['Tower cranes', 'Mobile cranes', 'Overhead cranes', 'Container cranes'],
    companies: ['Liebherr', 'Manitowoc', 'Tadano', 'Terex'],
    futureImpact: 'Real-time structural monitoring will enable cranes to safely exceed traditional limits.',
    color: '#F59E0B'
  },
  {
    icon: '⚙️',
    title: 'Electric Motor Torque',
    short: 'Instant power from electromagnetic forces',
    tagline: 'Maximum torque from zero RPM',
    description: 'Electric motors produce maximum torque at zero speed, unlike combustion engines. This enables incredible acceleration in EVs and precise control in robotics.',
    connection: 'Motor torque comes from the force between magnetic fields times the rotor radius. Current controls the magnetic field strength, so torque is directly controllable.',
    howItWorks: 'Electromagnetic force on conductors in a magnetic field creates rotation. Torque = force x radius. Controllers modulate current to achieve precise torque at any speed.',
    stats: [
      { value: '1000Nm', label: 'Tesla Plaid motor torque', icon: '⚡' },
      { value: '0rpm', label: 'Max torque speed', icon: '🎯' },
      { value: '1ms', label: 'Torque response time', icon: '⏱️' }
    ],
    examples: ['Electric vehicles', 'Industrial robots', 'CNC machines', 'Elevators'],
    companies: ['Tesla', 'ABB', 'Siemens', 'Fanuc'],
    futureImpact: 'In-wheel motors will provide independent torque control to each wheel for unprecedented handling.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A mechanic is trying to loosen a stubborn bolt. They're pushing on a wrench handle 30cm from the bolt with all their strength, but the bolt won't budge.",
    question: "What could the mechanic do to increase the torque without pushing harder?",
    options: [
      { id: 'a', label: "Push closer to the bolt head" },
      { id: 'b', label: "Use a longer wrench or add an extension pipe", correct: true },
      { id: 'c', label: "Push at an angle instead of perpendicular" },
      { id: 'd', label: "Use a thinner wrench for better grip" }
    ],
    explanation: "Torque = Force x Lever arm. A longer wrench increases the lever arm, producing more torque with the same force. This is why mechanics use 'breaker bars' for stuck bolts."
  },
  {
    scenario: "At a playground, a 40kg child sits 2 meters from the pivot on a seesaw. A 80kg adult wants to balance the seesaw.",
    question: "How far from the pivot should the adult sit?",
    options: [
      { id: 'a', label: "1 meter from the pivot", correct: true },
      { id: 'b', label: "2 meters from the pivot" },
      { id: 'c', label: "4 meters from the pivot" },
      { id: 'd', label: "It's impossible to balance" }
    ],
    explanation: "For balance: m1 x r1 = m2 x r2. So 40kg x 2m = 80kg x r2. Solving: r2 = 80/80 = 1 meter. The heavier person needs half the distance."
  },
  {
    scenario: "A door designer is deciding where to place the handle on a heavy fire door. The door weighs 50kg and swings on hinges at one edge.",
    question: "Why do door handles go at the edge opposite to the hinges?",
    options: [
      { id: 'a', label: "It looks better aesthetically" },
      { id: 'b', label: "Maximum lever arm minimizes the force needed to open", correct: true },
      { id: 'c', label: "The door is stronger at that edge" },
      { id: 'd', label: "Building codes require it for no physical reason" }
    ],
    explanation: "Placing the handle far from the hinge maximizes the lever arm, so users need minimal force to create enough torque to overcome the door's inertia and any friction."
  },
  {
    scenario: "A cyclist is climbing a steep hill and shifts to a smaller front chainring (fewer teeth). The rear gear stays the same.",
    question: "What happens to the torque at the rear wheel?",
    options: [
      { id: 'a', label: "Torque decreases, making climbing harder" },
      { id: 'b', label: "Torque increases, making climbing easier", correct: true },
      { id: 'c', label: "Torque stays the same, only speed changes" },
      { id: 'd', label: "Torque becomes zero" }
    ],
    explanation: "A smaller front chainring creates a mechanical advantage that multiplies the leg torque at the wheel. You pedal faster but with less resistance, effectively trading speed for more pushing power."
  },
  {
    scenario: "A crane operator is about to lift a 20-ton load. The boom is currently extended to 15 meters, and the load chart shows maximum capacity of 25 tons at this radius.",
    question: "Why does the crane's capacity decrease as the boom extends further?",
    options: [
      { id: 'a', label: "The boom gets weaker when extended" },
      { id: 'b', label: "The tipping moment (load x distance) increases, approaching the counterweight limit", correct: true },
      { id: 'c', label: "The cables can't hold as much when angled" },
      { id: 'd', label: "Wind resistance increases at longer extensions" }
    ],
    explanation: "Tipping moment = Load x Radius. As the boom extends, the same load creates a larger moment. The crane tips when the load moment exceeds the stabilizing moment from the counterweight."
  },
  {
    scenario: "A car has a 2-liter gasoline engine producing 200 Nm of peak torque at 4000 RPM. It's being replaced with an electric motor.",
    question: "At what RPM do electric motors produce their maximum torque?",
    options: [
      { id: 'a', label: "At peak RPM for maximum power" },
      { id: 'b', label: "At 0 RPM - instant torque from standstill", correct: true },
      { id: 'c', label: "At the same RPM as gasoline engines" },
      { id: 'd', label: "Electric motors don't produce torque" }
    ],
    explanation: "Electric motors produce maximum torque at zero RPM because torque is proportional to current, and maximum current can flow when the motor is stalled. This is why EVs accelerate so quickly from a stop."
  },
  {
    scenario: "A bolt specification calls for 100 Nm of torque. A technician applies 50 N of force to the wrench.",
    question: "How long must the wrench handle be to achieve the correct torque?",
    options: [
      { id: 'a', label: "0.5 meters" },
      { id: 'b', label: "1.0 meter" },
      { id: 'c', label: "2.0 meters", correct: true },
      { id: 'd', label: "5.0 meters" }
    ],
    explanation: "Torque = Force x Length. 100 Nm = 50 N x L. Solving: L = 100/50 = 2 meters. This is why torque wrenches have long handles - to reach high torques with reasonable human force."
  },
  {
    scenario: "Two workers are carrying a 100kg beam. Worker A is 1 meter from the center, and Worker B is 3 meters from the center (opposite side).",
    question: "How much weight does each worker support?",
    options: [
      { id: 'a', label: "Both support 50kg equally" },
      { id: 'b', label: "A supports 75kg, B supports 25kg", correct: true },
      { id: 'c', label: "A supports 25kg, B supports 75kg" },
      { id: 'd', label: "Cannot be determined without the beam length" }
    ],
    explanation: "By torque balance around the center: The load distribution is inversely proportional to distance. Since B is 3x farther, A carries 3x more. Total ratio is 3:1, so A carries 75kg and B carries 25kg."
  },
  {
    scenario: "An engineer is designing a bottle cap. The cap diameter is 30mm and requires 2 Nm of torque to open.",
    question: "If the cap diameter were doubled to 60mm, how much torque would a user naturally apply with the same grip force?",
    options: [
      { id: 'a', label: "1 Nm (half)" },
      { id: 'b', label: "2 Nm (same)" },
      { id: 'c', label: "4 Nm (double)", correct: true },
      { id: 'd', label: "8 Nm (quadruple)" }
    ],
    explanation: "Torque = Force x Radius. Doubling the diameter doubles the radius (lever arm). With the same grip force, the user applies double the torque. This is why jar lids have ridged edges to increase effective diameter."
  },
  {
    scenario: "A see-saw has a 30kg child at one end. To balance, you can either place weights at the other end or move the pivot point.",
    question: "If you move the pivot 25% closer to the child, how much weight is needed at the other end to balance?",
    options: [
      { id: 'a', label: "10kg" },
      { id: 'b', label: "15kg" },
      { id: 'c', label: "20kg" },
      { id: 'd', label: "22.5kg", correct: true }
    ],
    explanation: "If pivot moves 25% toward the child, child's arm becomes 0.75L and other side becomes 1.25L. Balance: 30kg x 0.75L = W x 1.25L. Solving: W = 22.5kg. Moving the pivot changes the torque balance."
  }
];

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

interface TorqueRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: number) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const TorqueRenderer: React.FC<TorqueRendererProps> = ({
  onGameEvent,
  gamePhase,
  onPhaseComplete
}) => {
  // Phase state
  const [phase, setPhase] = useState<Phase>('hook');

  // Sync phase with external prop
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [pushPosition, setPushPosition] = useState(0.8);
  const [hasFriction, setHasFriction] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [doorAngle, setDoorAngle] = useState(0);
  const [experimentCount, setExperimentCount] = useState(0);
  const [showForceVector, setShowForceVector] = useState(true);

  // Seesaw lab state (twist_play)
  const [leftWeight, setLeftWeight] = useState(3);
  const [leftPosition, setLeftPosition] = useState(0.4);
  const [rightWeight, setRightWeight] = useState(2);
  const [rightPosition, setRightPosition] = useState(0.8);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  const animationRef = useRef<number>();
  const isNavigating = useRef(false);

  // Physics calculations
  const requiredTorque = hasFriction ? 30 : 15;
  const leverArm = Math.max(0.1, pushPosition);
  const requiredForce = requiredTorque / leverArm;

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cleanup animation
  useEffect(() => {
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#A855F7', // Purple for torque
    accentGlow: 'rgba(168, 85, 247, 0.3)',
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

  // Emit game events
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    if (isNavigating.current) return;
    if (!phaseOrder.includes(newPhase)) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(newPhase);
    const phaseIndex = phaseOrder.indexOf(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(phaseIndex);
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [phase, emitEvent, onPhaseComplete]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Door physics
  const pushDoor = useCallback(() => {
    if (isPushing) return;
    setIsPushing(true);
    setDoorAngle(0);
    playSound('click');

    emitEvent('simulation_started', { pushPosition, requiredForce, hasFriction });

    const targetAngle = 60;
    const speed = 150 / requiredForce;
    let angle = 0;

    const animate = () => {
      angle += speed;
      setDoorAngle(Math.min(angle, targetAngle));

      if (angle < targetAngle) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsPushing(false);
        setExperimentCount(prev => prev + 1);
        playSound('success');
        emitEvent('simulation_started', { finalAngle: targetAngle, pushPosition, force: requiredForce });
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isPushing, pushPosition, requiredForce, hasFriction, emitEvent]);

  const resetDoor = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsPushing(false);
    setDoorAngle(0);
    emitEvent('parameter_changed', { action: 'reset' });
  }, [emitEvent]);

  // Return to dashboard handler
  const handleReturnToDashboard = useCallback(() => {
    emitEvent('mastery_achieved', { action: 'return_to_dashboard' });
    window.dispatchEvent(new CustomEvent('returnToDashboard'));
  }, [emitEvent]);

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #7C3AED)`,
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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Fixed bottom navigation bar with Back/Next + nav dots
  const renderNavDots = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = phase === 'mastery';
    const isTestPhase = phase === 'test' && !testSubmitted;

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
                  width: phase === p ? '20px' : '8px',
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
                }}
                aria-label={phaseLabels[p]}
              >
                <span style={{
                  display: 'block',
                  width: phase === p ? '20px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
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

  // ============================================================================
  // VISUALIZATION - Premium Door Animation
  // ============================================================================
  const renderVisualization = () => {
    const svgWidth = Math.min(360, isMobile ? 320 : 360);
    const hingeX = 60;
    const hingeY = 120;
    const doorLength = svgWidth - 120;
    const doorWidth = 20;
    const pushX = pushPosition * doorLength;

    return (
      <div>
        <svg width="100%" height={240} viewBox={`0 0 ${svgWidth} 240`} style={{ display: 'block', margin: '0 auto' }}>
          <defs>
            <linearGradient id="torqDoorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d4a574" />
              <stop offset="30%" stopColor="#c4956a" />
              <stop offset="50%" stopColor="#e0b88a" />
              <stop offset="70%" stopColor="#b8845a" />
              <stop offset="100%" stopColor="#8b5a2b" />
            </linearGradient>
            <radialGradient id="torqPivotGrad" cx="35%" cy="35%">
              <stop offset="0%" stopColor="#a1a1aa" />
              <stop offset="40%" stopColor="#71717a" />
              <stop offset="70%" stopColor="#52525b" />
              <stop offset="100%" stopColor="#3f3f46" />
            </radialGradient>
            <radialGradient id="torqFrictionPivotGrad" cx="35%" cy="35%">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="40%" stopColor="#ea580c" />
              <stop offset="70%" stopColor="#9a3412" />
              <stop offset="100%" stopColor="#7c2d12" />
            </radialGradient>
            <linearGradient id="torqForceGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#16a34a" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#86efac" />
            </linearGradient>
            <linearGradient id="torqLeverGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <radialGradient id="torqHandleGrad" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </radialGradient>
            <linearGradient id="torqWallGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#27272a" />
              <stop offset="80%" stopColor="#3f3f46" />
              <stop offset="100%" stopColor="#52525b" />
            </linearGradient>
            <filter id="torqForceGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#22c55e" floodOpacity="0.6" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="torqDoorShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="3" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
            </filter>
            <pattern id="torqGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#3a2850" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>

          <rect width={svgWidth} height={240} fill="#08050c" />
          <rect width={svgWidth} height={240} fill="url(#torqGrid)" />

          {/* Grid reference lines */}
          <line x1={0} y1={60} x2={svgWidth} y2={60} stroke="#3a2850" strokeWidth={0.5} opacity={0.4} />
          <line x1={0} y1={120} x2={svgWidth} y2={120} stroke="#3a2850" strokeWidth={0.5} opacity={0.4} />
          <line x1={0} y1={180} x2={svgWidth} y2={180} stroke="#3a2850" strokeWidth={0.5} opacity={0.4} />

          {/* Wall */}
          <rect x={0} y={hingeY - 80} width={50} height={160} fill="url(#torqWallGrad)" />
          <rect x={48} y={hingeY - 80} width={4} height={160} fill="#52525b" />

          {/* Door with rotation */}
          <g transform={`translate(${hingeX}, ${hingeY}) rotate(${doorAngle})`} filter="url(#torqDoorShadow)">
            <rect x={0} y={-doorWidth / 2} width={doorLength} height={doorWidth} rx={3} fill="url(#torqDoorGrad)" />

            {/* Door handle */}
            <circle cx={doorLength - 30} cy={0} r={10} fill="url(#torqHandleGrad)" stroke="#92400e" strokeWidth={2} />
            <circle cx={doorLength - 30} cy={0} r={4} fill="#78350f" />

            {/* Lever arm visualization */}
            {showForceVector && (
              <g>
                <line x1={0} y1={32} x2={pushX} y2={32} stroke="url(#torqLeverGrad)" strokeWidth={3} strokeDasharray="6,3" />
                <circle cx={0} cy={32} r={5} fill="#3b82f6" stroke="#60a5fa" strokeWidth={1} />
                <circle cx={pushX} cy={32} r={5} fill="#3b82f6" stroke="#60a5fa" strokeWidth={1} />
              </g>
            )}

            {/* Push point indicator */}
            <circle cx={pushX} cy={0} r={12} fill="#22c55e" stroke="#86efac" strokeWidth={2} filter="url(#torqForceGlow)">
              <animate attributeName="r" values="10;13;10" dur="1.2s" repeatCount="indefinite" />
            </circle>
            <circle cx={pushX} cy={0} r={4} fill="#fff" opacity={0.8} />

            {/* Force arrow */}
            {showForceVector && (
              <g transform={`translate(${pushX}, 0)`} filter="url(#torqForceGlow)">
                <line x1={0} y1={-18} x2={0} y2={-18 - requiredForce * 1.2} stroke="url(#torqForceGrad)" strokeWidth={4} strokeLinecap="round" />
                <polygon points={`0,${-18 - requiredForce * 1.2 - 10} -6,${-18 - requiredForce * 1.2} 6,${-18 - requiredForce * 1.2}`} fill="#86efac" />
              </g>
            )}
          </g>

          {/* Pivot/Hinge */}
          <g transform={`translate(${hingeX}, ${hingeY})`}>
            <circle r={16} fill={hasFriction ? 'url(#torqFrictionPivotGrad)' : 'url(#torqPivotGrad)'} stroke="#52525b" strokeWidth={2} />
            <circle r={5} fill={hasFriction ? '#ea580c' : '#71717a'} />
          </g>

          {/* Educational Labels */}
          <text x={hingeX} y={hingeY + 30} fill="#9CA3AF" fontSize="11" textAnchor="middle" fontWeight="600">Hinge (Pivot)</text>
          <text x={hingeX + doorLength / 2} y={hingeY - doorWidth - 8} fill="#e2e8f0" fontSize="11" textAnchor="middle">Door</text>
          <text x={hingeX + pushX} y={20} fill="#86efac" fontSize="11" textAnchor="middle">Push Point</text>
          {showForceVector && (
            <>
              <text x={hingeX + pushX + 30} y={hingeY - 40} fill="#22c55e" fontSize="11" textAnchor="start">Force (F)</text>
              <text x={hingeX + pushX / 2} y={hingeY + 55} fill="#60a5fa" fontSize="11" textAnchor="middle">Lever Arm (r)</text>
            </>
          )}
        </svg>

        {/* Stats display */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', marginTop: '8px' }}>
          <div style={{
            background: colors.bgCard,
            borderRadius: '10px',
            padding: '8px 12px',
            border: `1px solid ${colors.border}`,
            textAlign: 'center'
          }}>
            <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Torque</div>
            <div style={{ ...typo.h3, color: colors.accent }}>{requiredTorque} N-m</div>
          </div>
          <div style={{
            background: colors.bgCard,
            borderRadius: '10px',
            padding: '8px 12px',
            border: `1px solid ${colors.border}`,
            textAlign: 'center'
          }}>
            <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Required Force</div>
            <div style={{ ...typo.h3, color: requiredForce > 100 ? colors.error : colors.success }}>
              {requiredForce.toFixed(1)} N
            </div>
          </div>
        </div>

        {showForceVector && (
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <span style={{
              ...typo.small,
              color: '#3b82f6',
              fontWeight: 600,
              background: '#1e3a5f',
              padding: '4px 12px',
              borderRadius: '12px'
            }}>
              Lever arm r = {(pushPosition * 100).toFixed(0)}% of door length
            </span>
          </div>
        )}
      </div>
    );
  };

  // Seesaw visualization for twist phases
  const renderSeesawVisualization = () => {
    const svgWidth = Math.min(360, isMobile ? 320 : 360);

    return (
      <div>
        <svg width="100%" height={180} viewBox={`0 0 ${svgWidth} 180`} style={{ display: 'block', margin: '0 auto' }}>
          <defs>
            <linearGradient id="torqSeesawBoardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a3765c" />
              <stop offset="25%" stopColor="#8b6348" />
              <stop offset="50%" stopColor="#c9a07a" />
              <stop offset="75%" stopColor="#8b6348" />
              <stop offset="100%" stopColor="#6b4d38" />
            </linearGradient>
            <linearGradient id="torqFulcrumGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="40%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>
            <radialGradient id="torqHeavyWeightGrad" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </radialGradient>
            <radialGradient id="torqLightWeightGrad" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#15803d" />
            </radialGradient>
            <linearGradient id="torqGroundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e1e2e" />
              <stop offset="100%" stopColor="#0f0f1a" />
            </linearGradient>
            <filter id="torqWeightShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
            </filter>
          </defs>

          <rect width={svgWidth} height={180} fill="#08050c" />
          <rect x={0} y={145} width={svgWidth} height={35} fill="url(#torqGroundGrad)" />

          {/* Fulcrum */}
          <polygon points={`${svgWidth/2},115 ${svgWidth/2 - 28},145 ${svgWidth/2 + 28},145`} fill="url(#torqFulcrumGrad)" stroke="#9ca3af" strokeWidth={1.5} />

          {/* Seesaw board */}
          <g transform={`translate(${svgWidth/2}, 108)`}>
            <rect x={-(svgWidth - 90)/2} y={-6} width={svgWidth - 90} height={12} rx={4} fill="url(#torqSeesawBoardGrad)" />
          </g>

          {/* Left weight (heavier, closer) */}
          <g transform="translate(100, 78)" filter="url(#torqWeightShadow)">
            <circle r={28} fill="url(#torqHeavyWeightGrad)" stroke="#dc2626" strokeWidth={2}>
              <animate attributeName="cy" values="-2;2;-2" dur="3s" repeatCount="indefinite" />
            </circle>
            <text x={0} y={6} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">5kg</text>
          </g>

          {/* Right weight (lighter, farther) */}
          <g transform={`translate(${svgWidth - 80}, 78)`} filter="url(#torqWeightShadow)">
            <circle r={20} fill="url(#torqLightWeightGrad)" stroke="#16a34a" strokeWidth={2}>
              <animate attributeName="cy" values="2;-2;2" dur="3s" repeatCount="indefinite" />
            </circle>
            <text x={0} y={5} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">2kg</text>
          </g>

          {/* Lever arm indicators */}
          <line x1={svgWidth/2} y1={130} x2={100} y2={130} stroke="#3b82f6" strokeWidth={2} strokeDasharray="5,3" opacity={0.8} />
          <line x1={svgWidth/2} y1={130} x2={svgWidth - 80} y2={130} stroke="#f97316" strokeWidth={2} strokeDasharray="5,3" opacity={0.8} />

          {/* Pivot marker */}
          <circle cx={svgWidth/2} cy={115} r={4} fill="#a855f7" stroke="#c084fc" strokeWidth={1} />
        </svg>

        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <span style={{
            ...typo.small,
            color: colors.accent,
            fontWeight: 600,
            background: '#2d1f4e',
            padding: '6px 14px',
            borderRadius: '12px'
          }}>
            5kg x r1 = 2kg x r2 (Balanced!)
          </span>
        </div>
      </div>
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
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', paddingBottom: '100px', paddingTop: '48px' }}>

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🚪🔧
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Torque: The Rotational Force
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Ever noticed how pushing a door near the hinges is <span style={{ color: colors.accent }}>surprisingly hard</span>? The secret lies in understanding <span style={{ color: colors.success }}>torque</span> - the rotational equivalent of force!"
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
            "Give me a lever long enough and a fulcrum on which to place it, and I shall move the world."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Archimedes
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Torque
        </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'near_hinge', text: 'Near the hinge (close to pivot)' },
      { id: 'middle', text: 'In the middle of the door' },
      { id: 'far_edge', text: 'Far from hinge (at the handle)', correct: true },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px', paddingTop: '48px' }}>
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
            To open a door with the LEAST effort, where should you push?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width="100%" viewBox="0 0 300 200" style={{ display: 'block', margin: '0 auto', maxWidth: '400px' }}>
              <rect width="300" height="200" fill="#08050c" />
              {/* Wall */}
              <rect x="10" y="20" width="30" height="160" fill="#3f3f46" rx="2" />
              <rect x="38" y="20" width="4" height="160" fill="#52525b" />
              {/* Door */}
              <rect x="42" y="50" width="210" height="100" fill="#c4956a" rx="3" />
              {/* Hinge */}
              <circle cx="47" cy="100" r="10" fill="#71717a" stroke="#52525b" strokeWidth="2" />
              <circle cx="47" cy="100" r="4" fill="#52525b" />
              {/* Handle */}
              <circle cx="230" cy="100" r="10" fill="#f59e0b" stroke="#92400e" strokeWidth="2" />
              <circle cx="230" cy="100" r="4" fill="#78350f" />
              {/* Push position markers */}
              <text x="80" y="105" fill="#A855F7" fontSize="18" textAnchor="middle" fontWeight="bold">A</text>
              <text x="140" y="105" fill="#A855F7" fontSize="18" textAnchor="middle" fontWeight="bold">B</text>
              <text x="210" y="105" fill="#A855F7" fontSize="18" textAnchor="middle" fontWeight="bold">C</text>
              {/* Labels */}
              <text x="25" y="15" fill="#9CA3AF" fontSize="11" textAnchor="middle">Wall</text>
              <text x="47" y="190" fill="#9CA3AF" fontSize="11" textAnchor="middle">Hinge</text>
              <text x="230" y="190" fill="#9CA3AF" fontSize="11" textAnchor="middle">Handle</text>
              <text x="150" y="40" fill="#e2e8f0" fontSize="13" textAnchor="middle" fontWeight="600">Where should you push?</text>
            </svg>
            <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '16px' }}>
              Imagine a heavy door. The hinges are on one side. Where do you push to open it with the least effort?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  setPrediction(opt.id);
                  emitEvent('prediction_made', { prediction: opt.id });
                }}
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
                  {opt.id === 'near_hinge' ? 'A' : opt.id === 'middle' ? 'B' : 'C'}
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
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px', paddingTop: '48px' }}>
        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Torque Laboratory
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Adjust where you push and see how much force is needed.
          </p>

          {/* Core Formula */}
          <div style={{
            textAlign: 'center',
            marginBottom: '16px',
            padding: '12px 16px',
            background: `${colors.accent}15`,
            borderRadius: '10px',
            border: `1px solid ${colors.accent}33`,
          }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: colors.accent }}>
              τ = r × F
            </span>
            <span style={{ ...typo.small, color: colors.textSecondary, marginLeft: '12px' }}>
              Torque = Lever Arm × Force
            </span>
          </div>

          {/* Observation Guidance */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Try adjusting the push position slider below. Watch how the required force changes as you move closer to or farther from the hinge. Experiment with different positions to discover the relationship between lever arm length and force!
            </p>
          </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                {renderVisualization()}

                {/* Legend */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '16px',
                  marginTop: '12px',
                  padding: '12px',
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#71717a' }} />
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Hinge (Pivot Point)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }} />
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Push Point</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '3px', background: '#3b82f6' }} />
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Lever Arm (r)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '3px', height: '12px', background: '#22c55e' }} />
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Applied Force (F)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#c4956a' }} />
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Door Surface</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                {/* Push position slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Push Position</span>
                    <span style={{ touchAction: 'pan-y', ...typo.small, color: colors.accent, fontWeight: 600 }}>
                      {(pushPosition * 100).toFixed(0)}% from hinge
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={pushPosition}
                    onChange={(e) => {
                      setPushPosition(parseFloat(e.target.value));
                      resetDoor();
                      emitEvent('parameter_changed', { position: e.target.value });
                    }}
                    disabled={isPushing}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      cursor: isPushing ? 'not-allowed' : 'pointer',
                      accentColor: colors.accent,
                      touchAction: 'pan-y',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>Near hinge</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>At handle</span>
                  </div>
                  <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginTop: '8px', fontStyle: 'italic' }}>
                    When you increase the distance from the hinge, less force is needed. This is why door handles are placed far from hinges - it's practical design used in everyday engineering!
                  </p>
                </div>

                {/* Friction toggle */}
                <div style={{ marginBottom: '20px' }}>
                  <button
                    onClick={() => {
                      setHasFriction(!hasFriction);
                      resetDoor();
                      emitEvent('parameter_changed', { friction: !hasFriction });
                    }}
                    style={{
                      background: hasFriction ? `${colors.warning}22` : colors.bgSecondary,
                      border: `2px solid ${hasFriction ? colors.warning : colors.border}`,
                      borderRadius: '8px',
                      padding: '12px 20px',
                      cursor: 'pointer',
                      width: '100%',
                      color: hasFriction ? colors.warning : colors.textSecondary,
                      fontSize: typo.small.fontSize,
                      fontWeight: 600,
                      minHeight: '44px',
                    }}
                  >
                    {hasFriction ? '🔶 Sticky Hinge (Extra Resistance)' : '⚪ Normal Hinge'}
                  </button>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                  {doorAngle === 0 ? (
                    <button
                      onClick={pushDoor}
                      disabled={isPushing}
                      style={{
                        background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                        color: 'white',
                        border: 'none',
                        padding: '14px 28px',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: 700,
                        cursor: isPushing ? 'not-allowed' : 'pointer',
                        opacity: isPushing ? 0.6 : 1,
                        minHeight: '44px',
                      }}
                    >
                      Push Door!
                    </button>
                  ) : (
                    <button
                      onClick={resetDoor}
                      style={{
                        background: colors.bgSecondary,
                        color: colors.textPrimary,
                        border: `1px solid ${colors.border}`,
                        padding: '14px 28px',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        minHeight: '44px',
                      }}
                    >
                      Reset Door
                    </button>
                  )}
                  <button
                    onClick={() => setShowForceVector(!showForceVector)}
                    style={{
                      background: showForceVector ? `${colors.accent}22` : colors.bgSecondary,
                      color: showForceVector ? colors.accent : colors.textSecondary,
                      border: `1px solid ${showForceVector ? colors.accent : colors.border}`,
                      padding: '14px 20px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      minHeight: '44px',
                    }}
                  >
                    {showForceVector ? 'Vectors ON' : 'Vectors OFF'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {experimentCount > 0 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Experiments completed: {experimentCount} - Notice how force changes with position!
              </p>
            </div>
          )}

          {experimentCount >= 2 && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              I See the Pattern - Reveal the Physics!
            </button>
          )}
        </div>
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
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Torque
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              τ = r × F
            </div>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Torque (τ) equals the lever arm (r) times the force (F)
            </p>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Key Insight: The Lever Arm Matters!
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
              As you observed in the experiment, to create the same torque, you can use:
            </p>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>Large force + Short lever arm</li>
              <li>Small force + Long lever arm</li>
            </ul>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
              <p style={{ ...typo.small, color: colors.success, fontWeight: 600, marginBottom: '4px' }}>
                Push at the handle
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                Long lever arm = Less force needed
              </p>
            </div>
            <div style={{
              background: `${colors.error}11`,
              border: `1px solid ${colors.error}33`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>❌</div>
              <p style={{ ...typo.small, color: colors.error, fontWeight: 600, marginBottom: '4px' }}>
                Push near the hinge
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                Short lever arm = Lots more force!
              </p>
            </div>
          </div>

          {prediction && (
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: prediction === 'far_edge' ? colors.success : colors.textSecondary }}>
                Your prediction: {prediction === 'far_edge' ? 'Correct! You understood intuitively.' : 'Now you know the physics behind it!'}
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            New Challenge: Balancing!
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'heavy_far', text: 'Put the heavy weight farther from the pivot' },
      { id: 'heavy_close', text: 'Put the heavy weight closer to the pivot', correct: true },
      { id: 'impossible', text: "It's impossible to balance unequal weights" },
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
              New Variable: Seesaw Balance!
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            How do you balance a seesaw with unequal weights?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {renderSeesawVisualization()}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  setTwistPrediction(opt.id);
                  emitEvent('twist_prediction_made', { twistPrediction: opt.id });
                }}
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
                  {opt.id === 'heavy_far' ? 'A' : opt.id === 'heavy_close' ? 'B' : 'C'}
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
              Try the Seesaw!
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const leftTorque = leftWeight * leftPosition;
    const rightTorque = rightWeight * rightPosition;
    const isBalanced = Math.abs(leftTorque - rightTorque) < 0.5;
    const tilt = Math.min(15, Math.max(-15, (rightTorque - leftTorque) * 3));

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Seesaw Balance Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust weights and positions to achieve balance!
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                {/* Interactive seesaw SVG */}
                <svg width="100%" height={180} viewBox="0 0 360 180" style={{ display: 'block', margin: '0 auto' }}>
                  <defs>
                    <linearGradient id="twistBoardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#a3765c" />
                      <stop offset="50%" stopColor="#c9a07a" />
                      <stop offset="100%" stopColor="#6b4d38" />
                    </linearGradient>
                    <linearGradient id="twistFulcrumGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#6b7280" />
                      <stop offset="100%" stopColor="#374151" />
                    </linearGradient>
                    <radialGradient id="twistLeftGrad" cx="30%" cy="30%">
                      <stop offset="0%" stopColor="#fca5a5" />
                      <stop offset="100%" stopColor="#b91c1c" />
                    </radialGradient>
                    <radialGradient id="twistRightGrad" cx="30%" cy="30%">
                      <stop offset="0%" stopColor="#86efac" />
                      <stop offset="100%" stopColor="#15803d" />
                    </radialGradient>
                  </defs>

                  <rect width="360" height="180" fill="#08050c" />
                  <rect x="0" y="145" width="360" height="35" fill="#1e1e2e" />

                  {/* Fulcrum */}
                  <polygon points="180,110 150,145 210,145" fill="url(#twistFulcrumGrad)" stroke="#9ca3af" strokeWidth={1.5} />

                  {/* Board with tilt */}
                  <g transform={`rotate(${tilt}, 180, 105)`}>
                    <rect x="30" y="99" width="300" height="12" rx="4" fill="url(#twistBoardGrad)" />

                    {/* Left weight */}
                    <g transform={`translate(${30 + leftPosition * 150}, 75)`}>
                      <circle r={15 + leftWeight * 2} fill="url(#twistLeftGrad)" stroke="#dc2626" strokeWidth="2" />
                      <text x="0" y="5" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{leftWeight}kg</text>
                    </g>

                    {/* Right weight */}
                    <g transform={`translate(${180 + rightPosition * 150}, 75)`}>
                      <circle r={15 + rightWeight * 2} fill="url(#twistRightGrad)" stroke="#16a34a" strokeWidth="2" />
                      <text x="0" y="5" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{rightWeight}kg</text>
                    </g>
                  </g>

                  {/* Pivot glow if balanced */}
                  <circle cx="180" cy="110" r="6" fill={isBalanced ? colors.success : colors.accent} stroke={isBalanced ? '#86efac' : '#c084fc'} strokeWidth="2" />
                </svg>

                {/* Balance indicator */}
                <div style={{ textAlign: 'center', marginTop: '16px', marginBottom: '16px' }}>
                  <span style={{
                    ...typo.body,
                    fontWeight: 700,
                    color: isBalanced ? colors.success : colors.warning,
                    background: isBalanced ? `${colors.success}22` : `${colors.warning}22`,
                    padding: '8px 20px',
                    borderRadius: '20px',
                    border: `1px solid ${isBalanced ? colors.success : colors.warning}44`,
                  }}>
                    {isBalanced ? 'BALANCED!' : `Tilting ${leftTorque > rightTorque ? 'Left' : 'Right'}`}
                  </span>
                </div>

                {/* Torque display */}
                <div style={{
                  background: `${colors.accent}11`,
                  borderRadius: '12px',
                  padding: '16px',
                  border: `1px solid ${colors.accent}33`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', ...typo.body }}>
                    <span style={{ color: colors.textSecondary }}>
                      Left: <span style={{ color: colors.error, fontWeight: 600 }}>{leftTorque.toFixed(1)}</span> N-m
                    </span>
                    <span style={{ color: colors.textMuted }}>|</span>
                    <span style={{ color: colors.textSecondary }}>
                      Right: <span style={{ color: colors.success, fontWeight: 600 }}>{rightTorque.toFixed(1)}</span> N-m
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                {/* Controls */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                  <div style={{
                    background: `${colors.error}11`,
                    borderRadius: '12px',
                    padding: '16px',
                    border: `1px solid ${colors.error}33`,
                  }}>
                    <p style={{ height: '20px', ...typo.small, color: colors.error, fontWeight: 600, marginBottom: '12px' }}>Left Weight</p>
                    <div style={{ marginBottom: '12px' }}>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={leftWeight}
                        onChange={(e) => setLeftWeight(parseInt(e.target.value))}
                        style={{ touchAction: 'pan-y', width: '100%' }}
                      />
                      <p style={{ ...typo.small, color: colors.textPrimary, textAlign: 'center', marginTop: '4px' }}>{leftWeight} kg</p>
                    </div>
                    <p style={{ height: '20px', ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Position: {(leftPosition * 100).toFixed(0)}%</p>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={leftPosition}
                      onChange={(e) => setLeftPosition(parseFloat(e.target.value))}
                      style={{ touchAction: 'pan-y', width: '100%' }}
                    />
                  </div>

                  <div style={{
                    background: `${colors.success}11`,
                    borderRadius: '12px',
                    padding: '16px',
                    border: `1px solid ${colors.success}33`,
                  }}>
                    <p style={{ height: '20px', ...typo.small, color: colors.success, fontWeight: 600, marginBottom: '12px' }}>Right Weight</p>
                    <div style={{ marginBottom: '12px' }}>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={rightWeight}
                        onChange={(e) => setRightWeight(parseInt(e.target.value))}
                        style={{ touchAction: 'pan-y', width: '100%' }}
                      />
                      <p style={{ ...typo.small, color: colors.textPrimary, textAlign: 'center', marginTop: '4px' }}>{rightWeight} kg</p>
                    </div>
                    <p style={{ height: '20px', ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Position: {(rightPosition * 100).toFixed(0)}%</p>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={rightPosition}
                      onChange={(e) => setRightPosition(parseFloat(e.target.value))}
                      style={{ touchAction: 'pan-y', width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isBalanced && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              I Balanced It! Continue
            </button>
          )}
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
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Rotational Equilibrium
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', color: colors.warning }}>
              Sum of τ = 0
            </div>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              For balance, clockwise torques must equal counterclockwise torques
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>Balance Equation</h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                <code style={{ color: colors.warning }}>m1 x r1 = m2 x r2</code><br />
                The heavier object needs a shorter lever arm to balance!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '8px' }}>Real-World Applications</h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                This principle is used in cranes (counterweights), bridges (load distribution), mobiles (art), and even your own body (muscle leverage)!
              </p>
            </div>
          </div>

          {twistPrediction && (
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: twistPrediction === 'heavy_close' ? colors.success : colors.textSecondary }}>
                Your prediction: {twistPrediction === 'heavy_close' ? 'Correct! Great intuition!' : 'Now you understand the physics!'}
              </p>
            </div>
          )}

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
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px', paddingTop: '48px' }}>
        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Application {selectedApp + 1} of {realWorldApps.length} — Explore how torque is used in the real world
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
                How Torque Connects:
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

            {/* How It Works */}
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

            {/* Examples */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px', fontWeight: 600 }}>
                Real Examples:
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {app.examples.map((ex, i) => (
                  <span key={i} style={{
                    ...typo.small,
                    color: colors.textSecondary,
                    background: colors.bgSecondary,
                    padding: '4px 10px',
                    borderRadius: '12px',
                  }}>{ex}</span>
                ))}
              </div>
            </div>

            {/* Future Impact */}
            <div style={{
              background: `${app.color}11`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <span style={{ color: app.color, fontWeight: 600 }}>Future:</span> {app.futureImpact}
              </p>
            </div>

            {/* Got It button */}
            {!completedApps[selectedApp] ? (
              <button
                onClick={() => {
                  playSound('success');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{
                  background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Got It!
              </button>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <span style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>✓ Completed</span>
              </div>
            )}
          </div>

          {selectedApp < realWorldApps.length - 1 && (
            <button
              onClick={() => {
                playSound('click');
                const nextIdx = selectedApp + 1;
                setSelectedApp(nextIdx);
                const newCompleted = [...completedApps];
                newCompleted[nextIdx] = true;
                setCompletedApps(newCompleted);
              }}
              style={{ ...primaryButtonStyle, width: '100%', marginBottom: '12px' }}
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
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100vh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {renderProgressBar()}

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              {passed
                ? 'You understand torque and rotational physics!'
                : 'Review the concepts and try again.'}
            </p>

            {/* Question-by-Question Review */}
            <div style={{ maxWidth: '600px', margin: '0 auto 24px', textAlign: 'left' }}>
              <p style={{ ...typo.small, color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                Question-by-Question Review
              </p>
              <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '100px', paddingTop: '48px', flex: 1 }}>
                {testQuestions.map((q, i) => {
                  const correctOpt = q.options.find(o => o.correct);
                  const isCorrect = testAnswers[i] === correctOpt?.id;
                  const userOpt = q.options.find(o => o.id === testAnswers[i]);
                  return (
                    <div key={i} style={{
                      background: colors.bgCard,
                      borderRadius: '10px',
                      border: `2px solid ${isCorrect ? colors.success : colors.error}30`,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        padding: '10px 14px',
                        background: isCorrect ? `${colors.success}15` : `${colors.error}15`,
                        display: 'flex', alignItems: 'center', gap: '10px',
                      }}>
                        <div style={{
                          width: '26px', height: '26px', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '14px', fontWeight: 700,
                          background: isCorrect ? colors.success : colors.error,
                          color: 'white',
                        }}>
                          {isCorrect ? '\u2713' : '\u2717'}
                        </div>
                        <p style={{ ...typo.small, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                          Question {i + 1}
                        </p>
                      </div>
                      {!isCorrect && (
                        <div style={{ padding: '10px 14px' }}>
                          <p style={{ fontSize: '12px', color: colors.error, margin: '0 0 4px', fontWeight: 600 }}>
                            Your answer: {userOpt?.label || 'Not answered'}
                          </p>
                          <p style={{ fontSize: '12px', color: colors.success, margin: '0 0 6px', fontWeight: 600 }}>
                            Correct: {correctOpt?.label}
                          </p>
                          <p style={{ fontSize: '11px', color: colors.textMuted, margin: 0 }}>
                            {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

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
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px', paddingTop: '48px' }}>
        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Knowledge Test
          </h2>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
            Apply your understanding of torque concepts to real-world scenarios. Each question presents a practical situation involving rotational forces.
          </p>

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
          Torque Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand the physics of rotational force that shapes everything from door handles to crane operations.
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
              'Torque = Force x Lever arm (τ = r x F)',
              'Longer lever arms require less force',
              'Rotational equilibrium: Sum of torques = 0',
              'Heavy objects need shorter lever arms to balance',
              'Real applications: wrenches, bikes, cranes, motors',
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
            onClick={() => {
              setPhase('hook');
              setExperimentCount(0);
              setCurrentQuestion(0);
              setTestAnswers(Array(10).fill(null));
              setTestSubmitted(false);
              setTestScore(0);
              setCompletedApps([false, false, false, false]);
              setSelectedApp(0);
              setPrediction(null);
              setTwistPrediction(null);
              setPushPosition(0.8);
              setHasFriction(false);
              resetDoor();
            }}
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
          <button
            onClick={handleReturnToDashboard}
            style={primaryButtonStyle}
          >
            Return to Dashboard
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default TorqueRenderer;
