'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// BERNOULLI RENDERER - FLUID DYNAMICS & LIFT
// Premium 10-phase educational game with comprehensive learning structure
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Explore',
  review: 'Understanding',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Play',
  twist_review: 'Twist Review',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
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

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: number) => void;
  onBack?: () => void;
}

// ============================================================================
// COLORS & DESIGN SYSTEM
// ============================================================================

const colors = {
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  accent: '#06b6d4',
  secondary: '#8b5cf6',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  bgDark: '#020617',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  border: '#334155',
};

// ============================================================================
// TEST QUESTIONS - Scenario-based with detailed explanations
// ============================================================================

const testQuestions = [
  {
    scenario: "Water flows steadily through a garden hose. You partially cover the nozzle opening with your thumb, making the opening smaller.",
    question: "What happens to the water pressure at the narrow opening compared to inside the hose?",
    options: [
      { id: 'a', text: 'Pressure increases because water is compressed' },
      { id: 'b', text: 'Pressure decreases because velocity increases', correct: true },
      { id: 'c', text: 'Pressure stays the same since water is incompressible' },
      { id: 'd', text: 'Pressure fluctuates randomly' }
    ],
    explanation: "According to Bernoulli's principle, when fluid velocity increases (water speeds up through the narrow opening), pressure decreases. This is the fundamental inverse relationship between pressure and velocity in flowing fluids."
  },
  {
    scenario: "An airplane wing is designed with a curved upper surface and a flatter lower surface. During flight at cruising speed, air flows over both surfaces.",
    question: "Why does this wing shape generate upward lift?",
    options: [
      { id: 'a', text: "The wing pushes air downward, and Newton's third law pushes the wing up" },
      { id: 'b', text: 'Air travels faster over the curved top, creating lower pressure above', correct: true },
      { id: 'c', text: 'The curved surface traps air molecules that push upward' },
      { id: 'd', text: 'Gravity affects the wing less due to its aerodynamic shape' }
    ],
    explanation: "Air must travel farther over the curved top surface, so it moves faster. By Bernoulli's principle, faster-moving air has lower pressure. The higher pressure below the wing pushes it upward, generating lift."
  },
  {
    scenario: "A Venturi meter is installed in a water pipe to measure flow rate. The pipe narrows from 10 cm to 5 cm diameter at the throat section.",
    question: "What happens to the water in the narrow throat section?",
    options: [
      { id: 'a', text: 'Velocity decreases and pressure increases' },
      { id: 'b', text: 'Velocity increases and pressure decreases', correct: true },
      { id: 'c', text: 'Both velocity and pressure increase' },
      { id: 'd', text: 'Both velocity and pressure decrease' }
    ],
    explanation: "The Venturi effect demonstrates Bernoulli's principle: in the narrow throat, continuity requires velocity to increase (A1v1 = A2v2), and Bernoulli's equation shows that increased velocity means decreased pressure."
  },
  {
    scenario: "A soccer player kicks the ball with the outside of their foot, causing it to spin clockwise (when viewed from above) as it travels forward.",
    question: "In which direction will the ball curve?",
    options: [
      { id: 'a', text: "It curves to the player's left (toward the spin side with faster air)", correct: true },
      { id: 'b', text: "It curves to the player's right (away from the spin)" },
      { id: 'c', text: "It travels straight because spin doesn't affect trajectory" },
      { id: 'd', text: 'It dips downward faster than normal' }
    ],
    explanation: "The Magnus effect applies Bernoulli's principle to spinning objects. Clockwise spin creates faster airflow on the left side (lower pressure) and slower flow on the right (higher pressure). The ball curves toward the low-pressure side."
  },
  {
    scenario: "When you take a hot shower, the curtain often billows inward toward you, even though you're not touching it.",
    question: "What causes the shower curtain to move inward?",
    options: [
      { id: 'a', text: 'Static electricity from the water attracts the curtain' },
      { id: 'b', text: 'Hot steam is denser and pushes the curtain' },
      { id: 'c', text: 'Moving air from the shower has lower pressure than still air outside', correct: true },
      { id: 'd', text: 'Temperature difference creates a magnetic effect' }
    ],
    explanation: "Hot water creates rising air currents inside the shower. This moving air has lower pressure than the still air outside the curtain. The pressure difference pushes the curtain inward toward the low-pressure zone."
  },
  {
    scenario: "In a traditional carburetor, air flows through a narrowed section called the venturi, where a fuel line opening is positioned.",
    question: "How does the carburetor draw fuel into the airstream without a pump?",
    options: [
      { id: 'a', text: 'Gravity pulls fuel down from the tank above' },
      { id: 'b', text: 'Engine heat vaporizes the fuel automatically' },
      { id: 'c', text: 'Fast air in the venturi creates low pressure that sucks fuel up', correct: true },
      { id: 'd', text: 'Exhaust gases push fuel through the system' }
    ],
    explanation: "The carburetor uses the Venturi effect: air accelerates through the narrow section, creating low pressure. This pressure drop draws fuel from the bowl up through the jet and into the airstream, creating the fuel-air mixture for combustion."
  },
  {
    scenario: "A patient has atherosclerosis, where fatty plaques narrow an artery from 8mm to 3mm diameter. Blood continues flowing through the constricted region.",
    question: "What dangerous condition can Bernoulli's principle predict in this narrowed artery?",
    options: [
      { id: 'a', text: 'Blood will stop flowing completely at the narrowing' },
      { id: 'b', text: 'Higher velocity at the narrowing causes dangerously low pressure on artery walls', correct: true },
      { id: 'c', text: 'Blood pressure will increase throughout the entire body' },
      { id: 'd', text: 'Red blood cells will be destroyed by the constriction' }
    ],
    explanation: "Blood velocity increases dramatically at the narrowing (continuity equation). By Bernoulli's principle, this high velocity creates low pressure on the artery walls, which can cause the vessel to collapse or promote further plaque rupture."
  },
  {
    scenario: "An HVAC engineer is designing ductwork for a building. A main duct must split into three smaller branch ducts to serve different rooms.",
    question: "What must the engineer ensure about the combined cross-sectional area of the branch ducts?",
    options: [
      { id: 'a', text: 'Branch areas must be smaller to increase air velocity for better distribution' },
      { id: 'b', text: 'Combined branch area should equal main duct area to maintain pressure balance', correct: true },
      { id: 'c', text: "Branch areas don't matter because fans control the airflow" },
      { id: 'd', text: 'Branch areas must be larger to cool the air down' }
    ],
    explanation: "By continuity (A1v1 = A2v2) and Bernoulli's equation, if combined branch area equals main duct area, velocity and pressure remain stable. Otherwise, improper sizing causes pressure drops, noise, and inefficient air distribution."
  },
  {
    scenario: "A Formula 1 car's rear wing is mounted upside-down compared to an airplane wing, with the curved surface facing downward.",
    question: "Why is the wing inverted, and what force does it create?",
    options: [
      { id: 'a', text: 'To reduce drag by letting air pass smoothly over the top' },
      { id: 'b', text: 'To create downforce by generating lower pressure above the wing', correct: true },
      { id: 'c', text: 'To cool the engine by directing air flow downward' },
      { id: 'd', text: 'To create lift that makes the car lighter and faster' }
    ],
    explanation: "The inverted wing shape makes air travel faster over the top (now curved), creating lower pressure above than below. This pressure difference pushes the wing down, generating downforce that increases tire grip at high speeds."
  },
  {
    scenario: "A hydraulic dam's spillway channels water from the reservoir through a narrow chute before releasing it downstream. Engineers notice cavitation damage on the chute surface.",
    question: "How does Bernoulli's principle explain the cavitation occurring in the spillway?",
    options: [
      { id: 'a', text: 'Slow-moving water creates high pressure that erodes concrete' },
      { id: 'b', text: 'High velocity water has very low pressure, causing dissolved gas bubbles to form and collapse', correct: true },
      { id: 'c', text: 'Temperature changes cause the water to freeze and thaw rapidly' },
      { id: 'd', text: 'Debris in the water physically abrades the surface' }
    ],
    explanation: "In the narrow chute, water velocity increases dramatically, causing pressure to drop below the vapor pressure of water (Bernoulli effect). This creates vapor bubbles that violently collapse when pressure recovers downstream, damaging the concrete surface through cavitation."
  }
];

// ============================================================================
// REAL-WORLD APPLICATIONS DATA (Comprehensive)
// ============================================================================

const realWorldApps = [
  {
    icon: '✈️',
    title: 'Airplane Wing Lift',
    short: 'Aviation flight',
    tagline: 'The Science of Taking Flight',
    description: "Airplane wings are specifically shaped (airfoil) so that air travels faster over the curved upper surface than the flatter lower surface. This speed difference creates a pressure differential that generates lift, enabling aircraft weighing hundreds of tons to soar through the sky.",
    connection: "Bernoulli's principle directly explains lift generation: faster airflow over the wing creates lower pressure above, while slower airflow below maintains higher pressure. This pressure difference pushes the wing upward, overcoming gravity.",
    howItWorks: "The wing's camber (curvature) and angle of attack force air to travel a longer path over the top surface, increasing its velocity. According to Bernoulli's equation (P + 1/2pv^2 = constant), higher velocity means lower static pressure. The pressure difference across the wing multiplied by wing area equals lift force.",
    stats: [
      { value: '400+ tons', label: 'Max aircraft weight', icon: '⚖️' },
      { value: '180 mph', label: 'Takeoff speed (747)', icon: '🛫' },
      { value: '500,000 lbs', label: 'Lift force generated', icon: '📈' }
    ],
    examples: [
      'Boeing 747 wings generate over 500,000 pounds of lift at cruise',
      'Supersonic jets use delta wings for high-speed efficiency',
      'Gliders maximize lift-to-drag ratio for unpowered flight',
      'Fighter jets use variable-sweep wings for different flight regimes'
    ],
    companies: ['Boeing', 'Airbus', 'Lockheed Martin', 'Bombardier', 'Embraer'],
    futureImpact: 'Morphing wing technology and laminar flow control will increase fuel efficiency by 20-30%, while electric aircraft will revolutionize short-haul aviation.',
    color: '#3b82f6'
  },
  {
    icon: '⚾',
    title: 'Sports Ball Curves',
    short: 'Magnus effect in sports',
    tagline: 'How Spin Makes Balls Curve',
    description: "When a ball spins through the air, it drags air faster on one side and slower on the other. This creates a pressure difference that curves the ball's trajectory - the Magnus effect. Every sport from baseball to soccer to tennis uses this principle.",
    connection: "The Magnus effect is Bernoulli's principle applied to rotating objects. The spinning surface drags air along, creating faster flow (lower pressure) on one side and slower flow (higher pressure) on the other. The ball accelerates toward the low-pressure side.",
    howItWorks: "A baseball spinning at 2000 RPM creates significant pressure asymmetry. On the side moving with the airflow, relative speed is higher (lower pressure). On the opposite side, relative speed is lower (higher pressure). The pressure difference creates a lateral force of several ounces - enough to move the ball 17+ inches over 60 feet.",
    stats: [
      { value: '17 inches', label: 'Curveball deflection', icon: '📐' },
      { value: '2000 RPM', label: 'Typical spin rate', icon: '🔄' },
      { value: '100 mph', label: 'Fastball speed', icon: '⚡' }
    ],
    examples: [
      'Baseball curveballs can break over 17 inches from a straight path',
      "Soccer free kicks use spin to bend around defensive walls",
      'Tennis topspin keeps balls in play while adding speed',
      'Golf balls with backspin travel farther due to lift'
    ],
    companies: ['Rawlings', 'Wilson', 'Titleist', 'Adidas', 'Nike'],
    futureImpact: 'High-speed cameras and AI analysis are revolutionizing sports training, helping athletes optimize spin rates and release angles for maximum performance.',
    color: '#ef4444'
  },
  {
    icon: '⛽',
    title: 'Carburetors & Fuel Systems',
    short: 'Venturi fuel mixing',
    tagline: 'Powering Internal Combustion',
    description: "Carburetors use the Venturi effect to draw fuel into the airstream without mechanical pumps. As air accelerates through the narrowed throat section, pressure drops, pulling fuel from the bowl through the jet and atomizing it into a fine mist for combustion.",
    connection: "The carburetor venturi is a direct application of Bernoulli's principle: air velocity increases in the constriction, pressure decreases proportionally, and this low-pressure zone draws fuel upward against gravity through the fuel jet.",
    howItWorks: "Air enters the carburetor and passes through the venturi (narrow section). By continuity (A1v1 = A2v2), velocity increases in the throat. Bernoulli's equation shows pressure drops, creating suction on the fuel jet. The pressure differential draws fuel from the float bowl, atomizing it into the airstream at the ideal 14.7:1 air-fuel ratio.",
    stats: [
      { value: '14.7:1', label: 'Ideal air-fuel ratio', icon: '⚖️' },
      { value: '-2 psi', label: 'Venturi vacuum', icon: '📉' },
      { value: '50 microns', label: 'Fuel droplet size', icon: '💧' }
    ],
    examples: [
      'Motorcycle carburetors use multiple venturis for throttle response',
      'Aircraft carburetors have altitude compensation for pressure changes',
      'Racing carburetors feature adjustable jets for tuning',
      'Small engine carburetors power lawnmowers and chainsaws'
    ],
    companies: ['Holley', 'Edelbrock', 'Weber', 'Mikuni', 'Keihin'],
    futureImpact: 'While fuel injection has largely replaced carburetors in vehicles, understanding Venturi principles drives innovations in fuel atomization, emissions control, and alternative fuel systems.',
    color: '#f59e0b'
  },
  {
    icon: '🩺',
    title: 'Blood Flow & Cardiovascular',
    short: 'Medical fluid dynamics',
    tagline: 'The Fluid Mechanics of Life',
    description: "Blood flow through arteries follows Bernoulli's principle, especially at constrictions caused by atherosclerotic plaques. When arteries narrow, blood velocity increases dramatically while pressure on the vessel walls drops, which can lead to dangerous conditions.",
    connection: "Bernoulli's principle explains why narrowed arteries are dangerous: as blood speeds up through a stenosis, the low pressure can cause the vessel to collapse or promote turbulent flow that damages the endothelium and accelerates plaque growth.",
    howItWorks: "In a healthy artery, blood flows at about 30 cm/s. At a 75% stenosis, velocity can exceed 400 cm/s. Using Bernoulli's equation, this 10x velocity increase causes pressure to drop by approximately 100 mmHg, potentially reducing wall pressure below the critical collapse threshold.",
    stats: [
      { value: '5 L/min', label: 'Cardiac output', icon: '❤️' },
      { value: '120/80', label: 'Normal BP (mmHg)', icon: '📊' },
      { value: '30 cm/s', label: 'Aortic blood velocity', icon: '🌊' }
    ],
    examples: [
      'Carotid stenosis uses Doppler ultrasound velocity to estimate narrowing',
      'Aortic valve stenosis increases velocity from 1 to 5 m/s',
      'Coronary artery disease causes ischemia from pressure drops',
      'Aneurysms form where low pressure weakens vessel walls'
    ],
    companies: ['Medtronic', 'Boston Scientific', 'Abbott Vascular', 'Edwards Lifesciences', 'Johnson & Johnson'],
    futureImpact: 'Computational fluid dynamics modeling of blood flow enables personalized treatment planning, while bioresorbable stents and gene therapy offer new approaches to vascular disease.',
    color: '#ec4899'
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const BernoulliRenderer: React.FC<Props> = ({ onGameEvent, gamePhase, onPhaseComplete, onBack }) => {
  // Phase management
  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);

  // Prediction state
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);

  // Simulation state
  const [airSpeed, setAirSpeed] = useState(50);
  const [angleOfAttack, setAngleOfAttack] = useState(5);
  const [showPressure, setShowPressure] = useState(true);
  const [showStreamlines, setShowStreamlines] = useState(true);
  const [simulationMode, setSimulationMode] = useState<'wing' | 'ball'>('wing');
  const [ballSpin, setBallSpin] = useState(1500);
  const [animationTime, setAnimationTime] = useState(0);

  // Transfer phase state
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test phase state
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);

  const animationRef = useRef<number | undefined>(undefined);

  // Typography system
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
    elementGap: isMobile ? '8px' : '12px'
  };

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Phase sync from props
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setAnimationTime(t => t + 0.016);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Sound utility
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

  // Navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    const phaseIndex = phaseOrder.indexOf(newPhase);
    onPhaseComplete?.(phaseIndex);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });

    if (newPhase === 'play') {
      setAirSpeed(50);
      setAngleOfAttack(5);
      setSimulationMode('wing');
    } else if (newPhase === 'twist_play') {
      setAirSpeed(50);
      setBallSpin(1500);
      setSimulationMode('ball');
    }
  }, [playSound, onPhaseComplete, onGameEvent]);

  // Physics calculations
  const calculateLift = useCallback((speed: number, angle: number) => {
    const stallAngle = 15;
    const effectiveAngle = Math.min(angle, stallAngle);
    const lift = (speed / 100) ** 2 * (effectiveAngle / 15) * 100;
    return Math.min(100, lift);
  }, []);

  const calculateMagnusForce = useCallback((speed: number, spin: number) => {
    return (speed / 100) * (spin / 2000) * 50;
  }, []);

  const lift = calculateLift(airSpeed, angleOfAttack);
  const magnusForce = calculateMagnusForce(airSpeed, ballSpin);

  // Progress bar component
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        background: colors.bgCard,
        borderBottom: `1px solid ${colors.border}`,
        gap: '12px',
      }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {phaseOrder.map((p, idx) => (
            <div
              key={p}
              onClick={() => idx < currentIndex && goToPhase(p)}
              style={{
                width: p === phase ? 24 : 10,
                height: 10,
                borderRadius: 9999,
                background: idx < currentIndex ? colors.success : p === phase ? colors.primary : colors.bgCardLight,
                cursor: idx < currentIndex ? 'pointer' : 'default',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: '12px', fontWeight: 700, color: colors.textMuted }}>
          {currentIndex + 1}/{phaseOrder.length}
        </span>
        <div style={{
          padding: '4px 12px',
          borderRadius: 9999,
          background: `${colors.primary}20`,
          color: colors.primary,
          fontSize: '10px',
          fontWeight: 800,
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  // Navigation dots
  const renderNavDots = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div className="flex items-center gap-1.5">
        {phaseOrder.map((p, idx) => (
          <button
            key={p}
            onClick={() => goToPhase(p)}
            className={`h-2 rounded-full transition-all duration-300 ${
              phase === p
                ? 'bg-blue-400 w-6 shadow-lg shadow-blue-400/30'
                : currentIndex > idx
                  ? 'bg-emerald-500 w-2'
                  : 'bg-slate-700 w-2 hover:bg-slate-600'
            }`}
            title={phaseLabels[p]}
          />
        ))}
      </div>
    );
  };

  // ============================================================================
  // SIMULATION VISUALIZATIONS
  // ============================================================================

  const renderWingSimulation = () => {
    const simWidth = isMobile ? 320 : 500;
    const simHeight = 300;
    const centerX = simWidth / 2;
    const centerY = simHeight / 2;
    const wingLength = 120;

    return (
      <svg width={simWidth} height={simHeight} className="mx-auto">
        <defs>
          <linearGradient id="bernSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0c1929" />
            <stop offset="30%" stopColor="#1e3a5f" />
            <stop offset="70%" stopColor="#0f2847" />
            <stop offset="100%" stopColor="#0a1628" />
          </linearGradient>

          <linearGradient id="bernAirfoilMetal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="15%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="85%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          <radialGradient id="bernLowPressureGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
            <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="bernHighPressureGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
            <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="bernStreamParticleBlue" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="1" />
            <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="bernStreamParticleAmber" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="1" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="bernLiftArrow" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#6ee7b7" />
          </linearGradient>

          <filter id="bernPressureGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="bernParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="bernLiftGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <pattern id="bernLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e3a5f" strokeWidth="0.3" strokeOpacity="0.4" />
          </pattern>
        </defs>

        <rect width={simWidth} height={simHeight} fill="url(#bernSkyGrad)" />
        <rect width={simWidth} height={simHeight} fill="url(#bernLabGrid)" />

        {/* Streamlines */}
        {showStreamlines && (
          <g>
            {[-50, -35, -20].map((yOffset, i) => {
              const compression = 1 - (lift / 200);
              const animOffset = (animationTime * airSpeed * 0.5 + i * 50) % simWidth;
              const yPos = centerY + yOffset * compression;
              return (
                <g key={`top-${i}`}>
                  <path
                    d={`M 0 ${yPos} Q ${centerX - 60} ${yPos} ${centerX - 20} ${yPos + yOffset * 0.3 * (lift / 100)} Q ${centerX + 20} ${yPos + yOffset * 0.5 * (lift / 100)} ${centerX + 60} ${yPos} L ${simWidth} ${yPos}`}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth={1.5}
                    opacity={0.5}
                  />
                  <circle cx={animOffset} cy={yPos} r={5} fill="url(#bernStreamParticleBlue)" filter="url(#bernParticleGlow)" />
                  <circle cx={animOffset} cy={yPos} r={2} fill="#ffffff" opacity={0.9} />
                </g>
              );
            })}
            {[20, 35, 50].map((yOffset, i) => {
              const spread = 1 + (lift / 400);
              const animOffset = (animationTime * airSpeed * 0.35 + i * 50) % simWidth;
              const yPos = centerY + yOffset * spread;
              return (
                <g key={`bottom-${i}`}>
                  <path
                    d={`M 0 ${yPos} Q ${centerX - 50} ${yPos} ${centerX - 15} ${yPos - yOffset * 0.2 * (lift / 100)} Q ${centerX + 50} ${yPos - yOffset * 0.1 * (lift / 100)} ${simWidth} ${yPos}`}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth={1.5}
                    opacity={0.5}
                  />
                  <circle cx={animOffset} cy={yPos} r={5} fill="url(#bernStreamParticleAmber)" filter="url(#bernParticleGlow)" />
                  <circle cx={animOffset} cy={yPos} r={2} fill="#ffffff" opacity={0.9} />
                </g>
              );
            })}
          </g>
        )}

        {/* Pressure regions */}
        {showPressure && (
          <g>
            <ellipse
              cx={centerX}
              cy={centerY - 25}
              rx={70}
              ry={25}
              fill="url(#bernLowPressureGlow)"
              opacity={0.4 + (lift / 150)}
              filter="url(#bernPressureGlow)"
            />
            <ellipse
              cx={centerX}
              cy={centerY + 40}
              rx={60}
              ry={20}
              fill="url(#bernHighPressureGlow)"
              opacity={0.4 + (lift / 200)}
              filter="url(#bernPressureGlow)"
            />
          </g>
        )}

        {/* Airfoil */}
        <g transform={`translate(${centerX}, ${centerY}) rotate(${-angleOfAttack})`}>
          <path
            d={`M ${-wingLength / 2 + 2} 3 Q ${-wingLength / 4} ${-15} 0 ${-19} Q ${wingLength / 4} ${-15} ${wingLength / 2 + 2} 3 Q ${wingLength / 4} 8 0 10 Q ${-wingLength / 4} 8 ${-wingLength / 2 + 2} 3`}
            fill="#0a1628"
            opacity={0.4}
          />
          <path
            d={`M ${-wingLength / 2} 0 Q ${-wingLength / 4} ${-18} 0 ${-22} Q ${wingLength / 4} ${-18} ${wingLength / 2} 0 Q ${wingLength / 4} 5 0 7 Q ${-wingLength / 4} 5 ${-wingLength / 2} 0`}
            fill="url(#bernAirfoilMetal)"
            stroke="#64748b"
            strokeWidth={1.5}
          />
          <path
            d={`M ${-wingLength / 2 + 15} -2 Q ${-wingLength / 4} ${-16} 0 ${-20} Q ${wingLength / 4 - 10} ${-17} ${wingLength / 2 - 20} -4`}
            fill="none"
            stroke="#ffffff"
            strokeWidth={1}
            opacity={0.4}
          />
        </g>

        {/* Lift arrow */}
        {lift > 5 && (
          <g filter="url(#bernLiftGlow)">
            <line
              x1={centerX}
              y1={centerY}
              x2={centerX}
              y2={centerY - lift * 0.7}
              stroke="url(#bernLiftArrow)"
              strokeWidth={5}
              strokeLinecap="round"
            />
            <polygon
              points={`${centerX},${centerY - lift * 0.7 - 14} ${centerX - 10},${centerY - lift * 0.7 + 2} ${centerX + 10},${centerY - lift * 0.7 + 2}`}
              fill="#6ee7b7"
            />
          </g>
        )}

        {/* Wind indicator */}
        <g>
          <line x1={20} y1={centerY} x2={65} y2={centerY} stroke="#f8fafc" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
          <polygon points={`70,${centerY} 58,${centerY - 6} 58,${centerY + 6}`} fill="#f8fafc" opacity={0.7} />
        </g>

        {/* Educational labels */}
        <text x={15} y={20} fill="#93c5fd" fontSize="11" fontWeight="bold">Airfoil Cross-Section</text>
        <text x={85} y={centerY + 2} fill="#f8fafc" fontSize="9" textAnchor="middle">Airflow</text>
        <text x={centerX} y={simHeight - 10} textAnchor="middle" fill="#94a3b8" fontSize="9">Bernoulli Principle: Faster Flow = Lower Pressure</text>
      </svg>
    );
  };

  const renderBallSimulation = () => {
    const simWidth = isMobile ? 320 : 500;
    const simHeight = 300;
    const centerY = simHeight / 2;

    const ballX = (animationTime * airSpeed * 2) % (simWidth + 100) - 50;
    const curveAmount = magnusForce * 2;
    const ballY = centerY + Math.sin(ballX / 100) * curveAmount;
    const spinDirection = ballSpin > 0 ? 1 : -1;

    return (
      <svg width={simWidth} height={simHeight} className="mx-auto">
        <defs>
          <linearGradient id="bernFieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="20%" stopColor="#065f46" />
            <stop offset="50%" stopColor="#047857" />
            <stop offset="80%" stopColor="#065f46" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>

          <radialGradient id="bernBaseballLeather" cx="35%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#fafaf9" />
            <stop offset="70%" stopColor="#e7e5e4" />
            <stop offset="100%" stopColor="#d6d3d1" />
          </radialGradient>

          <linearGradient id="bernSeamColor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>

          <linearGradient id="bernMagnusArrow" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#db2777" />
            <stop offset="50%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#fbcfe8" />
          </linearGradient>

          <linearGradient id="bernTrajectoryGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.2" />
          </linearGradient>

          <linearGradient id="bernFastAirGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.3" />
          </linearGradient>

          <linearGradient id="bernSlowAirGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#fde68a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.3" />
          </linearGradient>

          <filter id="bernBallShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#0a0a0a" floodOpacity="0.4" />
          </filter>

          <filter id="bernMagnusGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="bernStreamlineGlow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <pattern id="bernGrassPattern" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="none" />
            <line x1="0" y1="8" x2="2" y2="0" stroke="#059669" strokeWidth="0.5" strokeOpacity="0.3" />
            <line x1="4" y1="8" x2="6" y2="0" stroke="#059669" strokeWidth="0.5" strokeOpacity="0.2" />
          </pattern>
        </defs>

        <rect width={simWidth} height={simHeight} fill="url(#bernFieldGrad)" />
        <rect width={simWidth} height={simHeight} fill="url(#bernGrassPattern)" />

        {/* Trajectory path */}
        <path
          d={`M 50 ${centerY} Q ${simWidth / 2} ${centerY + curveAmount * 3} ${simWidth - 50} ${centerY}`}
          fill="none"
          stroke="url(#bernTrajectoryGlow)"
          strokeWidth={4}
          strokeDasharray="12,6"
          opacity={0.7}
        />

        {/* Streamlines around ball */}
        {showStreamlines && ballX > 0 && ballX < simWidth && (
          <g transform={`translate(${ballX}, ${ballY})`}>
            <path
              d={`M -55 ${-15 * spinDirection} Q -15 ${-40 * spinDirection} 40 ${-15 * spinDirection}`}
              fill="none"
              stroke="url(#bernFastAirGlow)"
              strokeWidth={3}
              filter="url(#bernStreamlineGlow)"
            />
            <path
              d={`M -55 ${15 * spinDirection} Q -15 ${30 * spinDirection} 40 ${15 * spinDirection}`}
              fill="none"
              stroke="url(#bernSlowAirGlow)"
              strokeWidth={3}
              filter="url(#bernStreamlineGlow)"
            />
          </g>
        )}

        {/* Baseball */}
        <g transform={`translate(${ballX}, ${ballY}) rotate(${animationTime * ballSpin * 0.1})`} filter="url(#bernBallShadow)">
          <circle r={24} fill="url(#bernBaseballLeather)" />
          <circle r={24} fill="none" stroke="#a8a29e" strokeWidth={1.5} />
          <circle cx={-6} cy={-6} r={8} fill="#ffffff" opacity={0.3} />
          <path
            d="M -19 -9 Q -9 -20, 0 -14 Q 9 -9, 19 -14"
            fill="none"
            stroke="url(#bernSeamColor)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <path
            d="M -19 9 Q -9 20, 0 14 Q 9 9, 19 14"
            fill="none"
            stroke="url(#bernSeamColor)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </g>

        {/* Magnus force arrow */}
        {Math.abs(ballSpin) > 100 && ballX > 80 && ballX < simWidth - 80 && (
          <g transform={`translate(${ballX}, ${ballY})`} filter="url(#bernMagnusGlow)">
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={-magnusForce * 1.2}
              stroke="url(#bernMagnusArrow)"
              strokeWidth={5}
              strokeLinecap="round"
            />
            <polygon
              points={`0,${-magnusForce * 1.2 - 10} -8,${-magnusForce * 1.2 + 4} 8,${-magnusForce * 1.2 + 4}`}
              fill="#fbcfe8"
            />
          </g>
        )}

        {/* Educational labels */}
        <text x={15} y={20} fill="#f0abfc" fontSize="11" fontWeight="bold">Magnus Effect</text>
        <text x={simWidth / 2} y={simHeight - 10} textAnchor="middle" fill="#94a3b8" fontSize="9">Spin creates pressure difference via Bernoulli</text>
        <text x={simWidth - 15} y={20} textAnchor="end" fill="#fbbf24" fontSize="9">Curved Trajectory</text>
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  // HOOK PHASE
  const renderHook = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '600px',
      padding: '48px 24px',
      textAlign: 'center',
    }}>
      <h1 style={{
        fontSize: '36px',
        fontWeight: 800,
        lineHeight: 1.2,
        color: colors.textPrimary,
        marginBottom: '16px',
      }}>
        Why Do Airplanes Fly?
      </h1>

      <p style={{
        fontSize: '17px',
        fontWeight: 400,
        lineHeight: 1.6,
        color: colors.textSecondary,
        maxWidth: '600px',
        marginBottom: '32px',
      }}>
        How does a <span style={{ color: colors.accent }}>500-ton metal machine</span> stay in the air? The answer lies in one of physics' most elegant principles - Bernoulli's equation.
      </p>

      <div style={{
        background: colors.bgCard,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px',
        maxWidth: '500px',
        border: `1px solid ${colors.border}`,
        boxShadow: '0 4px 20px rgba(59,130,246,0.1)',
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>✈️</div>
        <div style={{
          background: colors.bgDark,
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '16px',
        }}>
          <span style={{ fontSize: '18px', fontFamily: 'monospace', color: '#93c5fd' }}>P + (1/2)pv² + pgh = constant</span>
        </div>
        <p style={{
          fontSize: '16px',
          fontWeight: 500,
          lineHeight: 1.6,
          color: 'rgba(255,255,255,0.9)',
        }}>
          In 1738, Daniel Bernoulli discovered that <span style={{ color: '#60a5fa' }}>faster-moving fluid has lower pressure</span>. This insight explains flight, curveballs, and more!
        </p>
      </div>

      <button
        onClick={() => goToPhase('predict')}
        style={{
          background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
          color: 'white',
          border: 'none',
          padding: '16px 32px',
          borderRadius: '12px',
          fontSize: '18px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
          transition: 'all 0.2s ease',
        }}
      >
        Start Learning
      </button>

      <div style={{
        marginTop: '32px',
        display: 'flex',
        gap: '24px',
        fontSize: '14px',
        fontWeight: 400,
        lineHeight: 1.5,
        color: colors.textMuted,
      }}>
        <div>Wing Simulation</div>
        <div>Magnus Effect</div>
        <div>Real Applications</div>
      </div>
    </div>
  );

  // PREDICT PHASE
  const renderPredict = () => (
    <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
      <p style={{ fontSize: '12px', fontWeight: 800, color: colors.primary, marginBottom: '8px', letterSpacing: '2px' }}>STEP 1 - MAKE YOUR PREDICTION</p>
      <h2 style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.3, color: colors.textPrimary, marginBottom: '24px' }}>The Paper Strip Challenge</h2>

      {/* SVG diagram */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <svg width="440" height="220" style={{ background: colors.bgCard, borderRadius: '12px' }}>
          <defs>
            <linearGradient id="predAirflow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
            </linearGradient>
            <filter id="predGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* Person blowing */}
          <circle cx="80" cy="100" r="30" fill="#334155" stroke="#64748b" strokeWidth="2" />
          <circle cx="72" cy="93" r="3" fill="#94a3b8" />
          <path d="M90,105 Q100,103 110,105" fill="none" stroke="#94a3b8" strokeWidth="2" />
          {/* Air stream above paper */}
          <g filter="url(#predGlow)">
            <path d="M100,95 Q200,85 350,90" fill="none" stroke="url(#predAirflow)" strokeWidth="3" strokeDasharray="8,4" />
            <path d="M100,100 Q200,92 350,95" fill="none" stroke="url(#predAirflow)" strokeWidth="2" strokeDasharray="6,3" />
          </g>
          {/* Paper strip */}
          <rect x="110" y="110" width="200" height="4" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
          {/* Labels */}
          <text x="220" y="80" textAnchor="middle" fill="#60a5fa" fontSize="12" fontWeight="bold">Fast air → Low pressure</text>
          <text x="220" y="145" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="bold">Still air → High pressure</text>
          {/* Question mark */}
          <text x="350" y="130" textAnchor="middle" fill={colors.accent} fontSize="24" fontWeight="bold">?</text>
          <text x="220" y="200" textAnchor="middle" fill={colors.textMuted} fontSize="11">What happens to the paper?</text>
          {/* Pressure arrows */}
          <path d="M200,140 L200,120" stroke="#fbbf24" strokeWidth="2" />
          <polygon points="196,122 204,122 200,114" fill="#fbbf24" />
          <path d="M260,140 L260,120" stroke="#fbbf24" strokeWidth="2" />
          <polygon points="256,122 264,122 260,114" fill="#fbbf24" />
        </svg>
      </div>

      <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '24px', border: `1px solid ${colors.border}` }}>
        <p style={{ fontSize: '16px', fontWeight: 400, lineHeight: 1.6, color: '#cbd5e1' }}>You hold a strip of paper below your lips and blow across the TOP of it (not under it). What happens to the paper?</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'A', text: 'It bends downward from the force of air' },
          { id: 'B', text: 'It rises up toward the airflow' },
          { id: 'C', text: 'It stays perfectly still' },
          { id: 'D', text: 'It flaps back and forth randomly' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => {
              setSelectedPrediction(option.id);
              setShowPredictionFeedback(true);
              playSound(option.id === 'B' ? 'success' : 'failure');
              onGameEvent?.({ type: 'prediction_made', data: { prediction: option.id, correct: option.id === 'B' } });
            }}
            disabled={showPredictionFeedback}
            style={{
              padding: '16px',
              borderRadius: '12px',
              textAlign: 'left',
              border: `2px solid ${showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'B' ? colors.success : colors.danger
                : showPredictionFeedback && option.id === 'B' ? colors.success
                : selectedPrediction === option.id ? colors.primary : colors.border}`,
              background: showPredictionFeedback && (selectedPrediction === option.id || option.id === 'B')
                ? option.id === 'B' ? `${colors.success}22` : `${colors.danger}22`
                : colors.bgCard,
              cursor: showPredictionFeedback ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontWeight: 700, color: 'white' }}>{option.id}.</span>
            <span style={{ color: '#e2e8f0', marginLeft: '8px' }}>{option.text}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div style={{ marginTop: '16px', padding: '16px', background: colors.bgCard, borderRadius: '12px', border: `1px solid ${colors.border}` }}>
          <p style={{ color: colors.success, fontWeight: 600, marginBottom: '8px' }}>{selectedPrediction === 'B' ? 'Correct!' : 'Not quite!'}</p>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>The paper rises! Fast air above creates low pressure by Bernoulli's principle. Higher pressure below pushes the paper up - exactly how airplane wings generate lift!</p>
          <button onClick={() => goToPhase('play')} style={{ marginTop: '12px', padding: '12px 24px', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: 'white', fontWeight: 600, borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}>
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  // PLAY PHASE
  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <p className="text-xs font-black text-blue-400 mb-2 tracking-widest">STEP 2 - INTERACTIVE LAB</p>
      <h2 className="text-2xl font-bold text-white mb-4">Bernoulli Flight Lab</h2>
      <p className="text-slate-400 mb-6 text-center max-w-lg">Adjust airspeed and wing angle to see how pressure differences create lift!</p>

      <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-4 border border-slate-700/50 mb-6 relative overflow-hidden">
        {simulationMode === 'wing' ? renderWingSimulation() : renderBallSimulation()}

        {/* Labels overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ fontSize: typo.small }}>
          {showPressure && simulationMode === 'wing' && (
            <>
              <div className="absolute text-blue-400 font-semibold" style={{ top: '25%', left: '50%', transform: 'translateX(-50%)' }}>
                LOW PRESSURE
              </div>
              <div className="absolute text-amber-400 font-semibold" style={{ top: '62%', left: '50%', transform: 'translateX(-50%)' }}>
                HIGH PRESSURE
              </div>
            </>
          )}
          {lift > 5 && simulationMode === 'wing' && (
            <div className="absolute text-emerald-400 font-bold" style={{ top: `${35 - lift * 0.15}%`, left: '55%' }}>
              LIFT
            </div>
          )}
        </div>
      </div>

      {/* Data panel */}
      <div className="grid grid-cols-3 gap-3 mb-6 w-full max-w-lg">
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-blue-400">Airspeed</div>
          <div className="text-lg font-bold text-white">{airSpeed} m/s</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-emerald-400">{simulationMode === 'wing' ? 'Lift Force' : 'Magnus Force'}</div>
          <div className="text-lg font-bold text-white">{simulationMode === 'wing' ? `${lift.toFixed(0)}%` : `${magnusForce.toFixed(1)} N`}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-amber-400">{simulationMode === 'wing' ? 'Wing Angle' : 'Spin Rate'}</div>
          <div className="text-lg font-bold text-white">{simulationMode === 'wing' ? `${angleOfAttack} deg` : `${ballSpin} RPM`}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-2 gap-4 w-full max-w-lg mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-blue-500/30">
          <label className="text-blue-400 text-sm block mb-2">Airspeed: {airSpeed} m/s</label>
          <input type="range" min={10} max={100} value={airSpeed} onChange={(e) => setAirSpeed(Number(e.target.value))} className="w-full accent-blue-500" style={{ width: '100%', height: '8px', cursor: 'pointer', accentColor: '#3b82f6' }} />
        </div>
        {simulationMode === 'wing' ? (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-amber-500/30">
            <label className="text-amber-400 text-sm block mb-2">Wing Angle: {angleOfAttack} deg {angleOfAttack > 12 && <span className="text-pink-400">Near stall!</span>}</label>
            <input type="range" min={0} max={20} value={angleOfAttack} onChange={(e) => setAngleOfAttack(Number(e.target.value))} className="w-full accent-amber-500" style={{ width: '100%', height: '8px', cursor: 'pointer', accentColor: '#f59e0b' }} />
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-pink-500/30">
            <label className="text-pink-400 text-sm block mb-2">Ball Spin: {ballSpin} RPM</label>
            <input type="range" min={-2500} max={2500} value={ballSpin} onChange={(e) => setBallSpin(Number(e.target.value))} className="w-full accent-pink-500" style={{ width: '100%', height: '8px', cursor: 'pointer', accentColor: '#ec4899' }} />
          </div>
        )}
      </div>

      {/* Toggle buttons */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        <button onClick={() => setShowStreamlines(!showStreamlines)} className={`px-4 py-2 rounded-lg text-sm font-medium ${showStreamlines ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
          Streamlines {showStreamlines ? 'ON' : 'OFF'}
        </button>
        <button onClick={() => setShowPressure(!showPressure)} className={`px-4 py-2 rounded-lg text-sm font-medium ${showPressure ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
          Pressure {showPressure ? 'ON' : 'OFF'}
        </button>
        <button onClick={() => setSimulationMode('wing')} className={`px-4 py-2 rounded-lg text-sm font-medium ${simulationMode === 'wing' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
          Wing Mode
        </button>
        <button onClick={() => setSimulationMode('ball')} className={`px-4 py-2 rounded-lg text-sm font-medium ${simulationMode === 'ball' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
          Ball Mode
        </button>
      </div>

      <div className="bg-blue-900/30 rounded-xl p-4 max-w-lg border border-blue-700/30 mb-6">
        <h3 className="text-blue-400 font-semibold mb-2">Key Observation</h3>
        <p className="text-slate-300 text-sm">Watch how faster airflow over the wing creates a low-pressure zone. The pressure difference between top and bottom creates an upward force - LIFT!</p>
      </div>

      <button onClick={() => goToPhase('review')} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl">
        Review the Concepts
      </button>
    </div>
  );

  // REVIEW PHASE
  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <p className="text-xs font-black text-emerald-400 mb-2 tracking-widest">STEP 3 - UNDERSTANDING</p>
      <h2 className="text-2xl font-bold text-white mb-6">Bernoulli's Principle Explained</h2>

      <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-2xl p-6 max-w-2xl mb-6 border border-emerald-700/30">
        <h3 className="text-xl font-bold text-emerald-400 mb-4">The Core Principle</h3>
        <div className="bg-slate-900/50 rounded-xl p-4 mb-4 text-center">
          <span className="text-2xl font-mono text-emerald-300">Faster Flow = Lower Pressure</span>
        </div>
        <p className="text-slate-300">When fluid speeds up (like air over a wing), its pressure drops. This is because total energy is conserved - kinetic energy increases, so pressure energy must decrease.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mb-6">
        <div className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 rounded-2xl p-6 border border-blue-700/30">
          <h3 className="text-xl font-bold text-blue-400 mb-3">The Bernoulli Equation</h3>
          <div className="bg-slate-900/50 rounded-lg p-3 mb-3 text-center">
            <span className="text-lg font-mono text-blue-300">P + (1/2)pv^2 + pgh = constant</span>
          </div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li><span className="text-blue-400 font-semibold">P</span> = Static pressure</li>
            <li><span className="text-blue-400 font-semibold">(1/2)pv^2</span> = Dynamic pressure (kinetic)</li>
            <li><span className="text-blue-400 font-semibold">pgh</span> = Hydrostatic pressure</li>
            <li>Total energy stays constant along a streamline</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 border border-emerald-700/30">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Wing Lift Mechanism</h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-slate-900/50 rounded-lg p-2 text-center">
              <div className="text-2xl">💨</div>
              <div className="text-xs text-slate-400">Fast = Low P</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2 text-center">
              <div className="text-2xl">🐌</div>
              <div className="text-xs text-slate-400">Slow = High P</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2 text-center">
              <div className="text-2xl">⬆️</div>
              <div className="text-xs text-slate-400">dP = Lift</div>
            </div>
          </div>
          <p className="text-slate-300 text-sm">Curved top = fast air = low pressure. Flat bottom = slow air = high pressure. The difference pushes the wing UP!</p>
        </div>
      </div>

      <button onClick={() => goToPhase('twist_predict')} className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Discover the Magnus Effect
      </button>
    </div>
  );

  // TWIST PREDICT PHASE
  const renderTwistPredict = () => (
    <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
      <p style={{ fontSize: '12px', fontWeight: 800, color: colors.warning, marginBottom: '8px', letterSpacing: '2px' }}>NEW TWIST: SPINNING OBJECTS</p>
      <h2 style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.3, color: colors.warning, marginBottom: '24px' }}>The Curveball Mystery</h2>

      {/* SVG diagram */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <svg width="440" height="220" style={{ background: colors.bgCard, borderRadius: '12px' }}>
          <defs>
            <radialGradient id="twistBallGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </radialGradient>
            <filter id="twistGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* Baseball */}
          <g filter="url(#twistGlow)">
            <circle cx="200" cy="110" r="30" fill="url(#twistBallGrad)" />
            <path d="M185,90 Q200,110 185,130" fill="none" stroke="#dc2626" strokeWidth="2" />
            <path d="M215,90 Q200,110 215,130" fill="none" stroke="#dc2626" strokeWidth="2" />
          </g>
          {/* Spin arrow */}
          <path d="M170,80 Q200,65 230,80" fill="none" stroke="#fbbf24" strokeWidth="2" />
          <polygon points="228,75 235,82 225,83" fill="#fbbf24" />
          <text x="200" y="60" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold">SPIN</text>
          {/* Fast air side */}
          <path d="M80,95 Q140,85 170,90" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="6,3" />
          <path d="M80,105 Q140,95 170,100" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="6,3" />
          <text x="100" y="80" fill="#60a5fa" fontSize="11" fontWeight="bold">Fast air</text>
          <text x="100" y="145" fill="#60a5fa" fontSize="10">Low pressure</text>
          {/* Slow air side */}
          <path d="M230,120 Q290,125 350,120" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="6,3" />
          <path d="M230,130 Q290,135 350,130" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="6,3" />
          <text x="320" y="110" fill="#fbbf24" fontSize="11" fontWeight="bold">Slow air</text>
          <text x="320" y="155" fill="#fbbf24" fontSize="10">High pressure</text>
          {/* Curve arrow */}
          <path d="M200,150 Q180,170 160,180" fill="none" stroke={colors.accent} strokeWidth="3" />
          <polygon points="164,176 156,184 168,182" fill={colors.accent} />
          <text x="200" y="200" textAnchor="middle" fill={colors.textMuted} fontSize="11">Which way does it curve?</text>
        </svg>
      </div>

      <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '24px', border: `1px solid ${colors.border}` }}>
        <p style={{ fontSize: '16px', fontWeight: 400, lineHeight: 1.6, color: '#cbd5e1' }}>A baseball pitcher throws a curveball. The ball spins as it travels, creating faster airflow on one side than the other. What do you predict happens?</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'A', text: 'Toward the side with faster-moving air (lower pressure)' },
          { id: 'B', text: 'Away from the side with faster-moving air' },
          { id: 'C', text: "It doesn't curve - that's an optical illusion" },
          { id: 'D', text: 'Straight down from gravity only' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => {
              setTwistPrediction(option.id);
              setShowTwistFeedback(true);
              playSound(option.id === 'A' ? 'success' : 'failure');
              onGameEvent?.({ type: 'twist_prediction_made', data: { prediction: option.id, correct: option.id === 'A' } });
            }}
            disabled={showTwistFeedback}
            style={{
              padding: '16px',
              borderRadius: '12px',
              textAlign: 'left',
              border: `2px solid ${showTwistFeedback && twistPrediction === option.id
                ? option.id === 'A' ? colors.success : colors.danger
                : showTwistFeedback && option.id === 'A' ? colors.success
                : twistPrediction === option.id ? colors.warning : colors.border}`,
              background: showTwistFeedback && (twistPrediction === option.id || option.id === 'A')
                ? option.id === 'A' ? `${colors.success}22` : `${colors.danger}22`
                : colors.bgCard,
              cursor: showTwistFeedback ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontWeight: 700, color: 'white' }}>{option.id}.</span>
            <span style={{ color: '#e2e8f0', marginLeft: '8px' }}>{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div style={{ marginTop: '16px', padding: '16px', background: colors.bgCard, borderRadius: '12px', border: `1px solid ${colors.border}` }}>
          <p style={{ color: colors.success, fontWeight: 600, marginBottom: '8px' }}>{twistPrediction === 'A' ? 'Excellent!' : 'Not quite!'}</p>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>The ball curves toward the low-pressure side! Spin drags air faster on one side (lower pressure) and slower on the other (higher pressure). This is the Magnus effect - Bernoulli's principle applied to spinning objects.</p>
          <button onClick={() => goToPhase('twist_play')} style={{ marginTop: '12px', padding: '12px 24px', background: `linear-gradient(135deg, ${colors.warning}, #ea580c)`, color: 'white', fontWeight: 600, borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}>
            Explore the Magnus Effect
          </button>
        </div>
      )}
    </div>
  );

  // TWIST PLAY PHASE
  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <p className="text-xs font-black text-amber-400 mb-2 tracking-widest">STEP 5 - TWIST LAB</p>
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Magnus Effect Lab</h2>
      <p className="text-slate-400 mb-6 text-center max-w-lg">Adjust pitch speed and spin to see how the ball curves!</p>

      <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-4 border border-amber-700/30 mb-6 relative overflow-hidden">
        {renderBallSimulation()}

        <div className="absolute inset-0 pointer-events-none text-xs">
          {showStreamlines && (
            <>
              <div className="absolute text-blue-400 font-medium" style={{ top: '30%', left: '45%' }}>
                Fast (Low P)
              </div>
              <div className="absolute text-amber-400 font-medium" style={{ top: '60%', left: '45%' }}>
                Slow (High P)
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 w-full max-w-lg mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-blue-500/30">
          <label className="text-blue-400 text-sm block mb-2">Pitch Speed: {airSpeed} m/s</label>
          <input type="range" min={10} max={100} value={airSpeed} onChange={(e) => setAirSpeed(Number(e.target.value))} className="w-full accent-blue-500" style={{ width: '100%', height: '8px', cursor: 'pointer', accentColor: '#3b82f6' }} />
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-pink-500/30">
          <label className="text-pink-400 text-sm block mb-2">Ball Spin: {ballSpin} RPM</label>
          <input type="range" min={-2500} max={2500} value={ballSpin} onChange={(e) => setBallSpin(Number(e.target.value))} className="w-full accent-pink-500" style={{ width: '100%', height: '8px', cursor: 'pointer', accentColor: '#ec4899' }} />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Backspin (up)</span>
            <span>Topspin (down)</span>
          </div>
        </div>
      </div>

      <div className="bg-pink-900/30 rounded-xl p-4 max-w-lg border border-pink-700/30 mb-6">
        <h3 className="text-pink-400 font-semibold mb-2">The Magnus Effect</h3>
        <p className="text-slate-300 text-sm">Spin drags air faster on one side (lower pressure) and slower on the other (higher pressure). The ball is pushed from high to low pressure - creating curves that seem to defy physics!</p>
      </div>

      <button onClick={() => goToPhase('twist_review')} className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Review the Discovery
      </button>
    </div>
  );

  // TWIST REVIEW PHASE
  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <p className="text-xs font-black text-amber-400 mb-2 tracking-widest">STEP 6 - COMPLETE UNDERSTANDING</p>
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Magnus Effect Explained</h2>

      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl mb-6 border border-amber-700/30">
        <h3 className="text-xl font-bold text-amber-400 mb-4">Bernoulli + Rotation = Magnus</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <h4 className="text-blue-400 font-semibold mb-2">Backspin Effect</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>Bottom moves WITH airflow (faster)</li>
              <li>Top moves AGAINST airflow (slower)</li>
              <li>Ball curves UP (floats longer)</li>
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <h4 className="text-amber-400 font-semibold mb-2">Topspin Effect</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>Top moves WITH airflow (faster)</li>
              <li>Bottom moves AGAINST (slower)</li>
              <li>Ball curves DOWN (drops faster)</li>
            </ul>
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 mt-4 text-center">
          <span className="text-pink-400 font-mono">F_Magnus = (1/2) * C_L * p * A * v^2</span>
        </div>
      </div>

      <div className="bg-indigo-900/30 rounded-xl p-4 max-w-2xl border border-indigo-700/30 mb-6">
        <h3 className="text-indigo-400 font-semibold mb-2">Applications</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-slate-900/50 rounded p-2">
            <div className="text-xl">⚾</div>
            <div className="text-xs text-slate-400">Curveballs</div>
          </div>
          <div className="bg-slate-900/50 rounded p-2">
            <div className="text-xl">⚽</div>
            <div className="text-xs text-slate-400">Free kicks</div>
          </div>
          <div className="bg-slate-900/50 rounded p-2">
            <div className="text-xl">🎾</div>
            <div className="text-xs text-slate-400">Topspin</div>
          </div>
          <div className="bg-slate-900/50 rounded p-2">
            <div className="text-xl">⛳</div>
            <div className="text-xs text-slate-400">Golf lift</div>
          </div>
        </div>
      </div>

      <button onClick={() => goToPhase('transfer')} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl">
        Explore Real-World Applications
      </button>
    </div>
  );

  // TRANSFER PHASE
  const renderTransfer = () => {
    const app = realWorldApps[activeApp];
    const isCompleted = completedApps.has(activeApp);

    return (
      <div className="flex flex-col items-center p-6">
        <p className="text-xs font-black text-indigo-400 mb-2 tracking-widest">STEP 7 - REAL-WORLD APPLICATIONS</p>
        <h2 className="text-2xl font-bold text-white mb-6">Bernoulli in Action</h2>

        {/* Tab navigation */}
        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          {realWorldApps.map((a, i) => {
            const completed = completedApps.has(i);
            const isUnlocked = i === 0 || completedApps.has(i - 1);
            return (
              <button
                key={i}
                onClick={() => isUnlocked && setActiveApp(i)}
                disabled={!isUnlocked}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeApp === i ? 'bg-indigo-600 text-white'
                  : completed ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                  : isUnlocked ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                }`}
              >
                {completed ? '✓' : a.icon} {a.short}
              </button>
            );
          })}
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-3xl w-full border border-slate-700/50">
          {/* Header */}
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl" style={{ color: app.color }}>{app.icon}</div>
            <div>
              <h3 className="text-xl font-bold text-white">{app.title}</h3>
              <p className="text-sm" style={{ color: app.color }}>{app.tagline}</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-slate-300 mb-4">{app.description}</p>

          {/* Connection to Bernoulli */}
          <div className="bg-blue-900/30 rounded-xl p-4 mb-4 border border-blue-700/30">
            <h4 className="text-blue-400 font-semibold mb-2">Bernoulli Connection</h4>
            <p className="text-slate-300 text-sm">{app.connection}</p>
          </div>

          {/* How it works */}
          <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
            <h4 className="text-indigo-400 font-semibold mb-2">How It Works</h4>
            <p className="text-slate-300 text-sm">{app.howItWorks}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {app.stats.map((stat, i) => (
              <div key={i} className="bg-slate-900/50 rounded-lg p-3 text-center">
                <div className="text-lg mb-1">{stat.icon}</div>
                <div className="text-lg font-bold" style={{ color: app.color }}>{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Examples */}
          <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
            <h4 className="text-emerald-400 font-semibold mb-2">Real Examples</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              {app.examples.map((ex, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400">*</span>{ex}
                </li>
              ))}
            </ul>
          </div>

          {/* Companies */}
          <div className="mb-4">
            <h4 className="text-slate-400 text-sm font-semibold mb-2">Leading Companies</h4>
            <div className="flex flex-wrap gap-2">
              {app.companies.map((company, i) => (
                <span key={i} className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300">{company}</span>
              ))}
            </div>
          </div>

          {/* Future Impact */}
          <div className="bg-purple-900/30 rounded-xl p-4 mb-4 border border-purple-700/30">
            <h4 className="text-purple-400 font-semibold mb-2">Future Impact</h4>
            <p className="text-slate-300 text-sm">{app.futureImpact}</p>
          </div>

          {/* Mark as complete button */}
          {!isCompleted ? (
            <button
              onClick={() => {
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
                playSound('complete');
                onGameEvent?.({ type: 'app_explored', data: { app: app.title, index: activeApp } });
                if (activeApp < realWorldApps.length - 1) {
                  setTimeout(() => setActiveApp(activeApp + 1), 500);
                }
              }}
              className="w-full py-3 rounded-xl font-semibold text-white"
              style={{ background: `linear-gradient(to right, ${app.color}, ${app.color}cc)` }}
            >
              Mark "{app.title}" as Understood
            </button>
          ) : (
            <div className="w-full py-3 rounded-xl font-semibold text-center bg-emerald-600/30 text-emerald-400 border border-emerald-500">
              Completed!
            </div>
          )}
        </div>

        {/* Progress and continue */}
        <div className="mt-6 flex items-center gap-4">
          <span className="text-slate-400">Progress:</span>
          <div className="flex gap-1">
            {realWorldApps.map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />
            ))}
          </div>
          <span className="text-slate-400">{completedApps.size}/{realWorldApps.length}</span>
        </div>

        {completedApps.size >= realWorldApps.length && (
          <button onClick={() => goToPhase('test')} className="mt-6 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl">
            Take the Knowledge Test
          </button>
        )}
      </div>
    );
  };

  // TEST PHASE
  const [showTestExplanation, setShowTestExplanation] = useState(false);
  const [testScore, setTestScore] = useState(0);

  const renderTest = () => {
    if (testSubmitted) {
      const passed = testScore >= 7;

      return (
        <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>{passed ? '🏆' : '📚'}</div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1.3, color: passed ? colors.success : colors.warning, marginBottom: '16px' }}>
            {passed ? 'Excellent Work!' : 'Keep Learning!'}
          </h2>
          <p style={{ fontSize: '36px', fontWeight: 800, lineHeight: 1.2, color: colors.textPrimary, margin: '16px 0' }}>
            {testScore} / 10
          </p>
          <p style={{ fontSize: '16px', fontWeight: 400, lineHeight: 1.6, color: colors.textSecondary, marginBottom: '32px' }}>
            {passed ? "You have mastered Bernoulli's principle!" : 'Review the concepts and try again.'}
          </p>
          <button
            onClick={() => {
              if (passed) {
                goToPhase('mastery');
              } else {
                setTestSubmitted(false);
                setTestIndex(0);
                setTestAnswers(Array(10).fill(null));
                setShowTestExplanation(false);
                goToPhase('review');
              }
            }}
            style={{
              padding: '14px 28px',
              borderRadius: '12px',
              border: 'none',
              background: passed ? `linear-gradient(135deg, ${colors.success}, #0d9488)` : `linear-gradient(135deg, ${colors.primary}, #6366f1)`,
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {passed ? 'Next: Achieve Mastery' : 'Back to Review'}
          </button>
        </div>
      );
    }

    const q = testQuestions[testIndex];
    const selected = testAnswers[testIndex];
    const isCorrect = selected !== null && q.options[selected]?.correct;

    return (
      <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <span style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.5, color: colors.textSecondary }}>
            Question {testIndex + 1} of 10
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {testQuestions.map((_, i) => (
              <div key={i} style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: i === testIndex ? colors.primary : testAnswers[i] !== null ? colors.success : colors.border,
              }} />
            ))}
          </div>
        </div>

        {/* Scenario */}
        <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px', borderLeft: `3px solid ${colors.primary}` }}>
          <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.5, color: colors.textSecondary, margin: 0, fontStyle: 'italic' }}>{q.scenario}</p>
        </div>

        <h3 style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1.3, color: colors.textPrimary, marginBottom: '20px' }}>{q.question}</h3>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {q.options.map((opt, i) => {
            let borderColor = colors.border;
            let bgColor = colors.bgCard;
            if (showTestExplanation) {
              if (opt.correct) { borderColor = colors.success; bgColor = `${colors.success}22`; }
              else if (selected === i && !opt.correct) { borderColor = colors.danger; bgColor = `${colors.danger}22`; }
            } else if (selected === i) {
              borderColor = colors.primary; bgColor = `${colors.primary}22`;
            }
            return (
              <button
                key={i}
                onClick={() => {
                  if (!showTestExplanation) {
                    playSound('click');
                    const newAnswers = [...testAnswers];
                    newAnswers[testIndex] = i;
                    setTestAnswers(newAnswers);
                  }
                }}
                disabled={showTestExplanation}
                style={{
                  background: bgColor,
                  border: `2px solid ${borderColor}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: showTestExplanation ? 'default' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 400, lineHeight: 1.5 }}>{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showTestExplanation && (
          <div style={{
            background: isCorrect ? `${colors.success}22` : `${colors.danger}22`,
            border: `1px solid ${isCorrect ? colors.success : colors.danger}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: isCorrect ? colors.success : colors.danger, marginBottom: '8px' }}>
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            <p style={{ fontSize: '14px', fontWeight: 400, lineHeight: 1.5, color: colors.textSecondary, margin: 0 }}>{q.explanation}</p>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {!showTestExplanation && selected !== null && (
            <button
              onClick={() => {
                playSound(isCorrect ? 'success' : 'failure');
                setShowTestExplanation(true);
              }}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: colors.primary,
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
            >
              Check Answer
            </button>
          )}

          {showTestExplanation && testIndex < 9 && (
            <button
              onClick={() => {
                setTestIndex(testIndex + 1);
                setShowTestExplanation(false);
              }}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: colors.primary,
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
            >
              Next Question
            </button>
          )}

          {showTestExplanation && testIndex === 9 && (
            <button
              onClick={() => {
                const score = testAnswers.reduce((acc, ans, i) => {
                  if (ans === null) return acc;
                  return acc + (testQuestions[i].options[ans]?.correct ? 1 : 0);
                }, 0);
                setTestScore(score);
                setTestSubmitted(true);
                playSound(score >= 7 ? 'complete' : 'failure');
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
                transition: 'all 0.2s ease',
              }}
            >
              See Results
            </button>
          )}
        </div>
      </div>
    );
  };

  // MASTERY PHASE
  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] p-6 text-center relative overflow-hidden">
      {/* Confetti */}
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: 10,
            height: 10,
            background: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'][i % 5],
            borderRadius: 2,
            animation: `confetti-fall 3s ease-out ${Math.random() * 2}s infinite`,
            opacity: 0.8,
          }}
        />
      ))}

      <div className="relative z-10">
        <div className="w-28 h-28 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mb-6 mx-auto"
          style={{ boxShadow: '0 0 60px rgba(59, 130, 246, 0.5)', animation: 'float 3s ease-in-out infinite' }}>
          <span className="text-6xl">🏆</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
          Fluid Dynamics Master!
        </h1>

        <p className="text-xl text-slate-300 max-w-lg mx-auto mb-8">
          You've mastered Bernoulli's Principle and the Magnus Effect. From airplane wings to curveballs, you now understand the physics of moving fluids!
        </p>

        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {['Bernoulli Equation', 'Wing Lift', 'Magnus Effect', 'Venturi Effect'].map((item, i) => (
            <div key={i} className="px-4 py-2 rounded-full bg-slate-800 text-slate-300 text-sm font-medium">
              * {item}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-4 max-w-md mx-auto mb-8">
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">✈️</div>
            <div className="text-xs text-slate-400">Flight</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">⚾</div>
            <div className="text-xs text-slate-400">Sports</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">⛽</div>
            <div className="text-xs text-slate-400">Engines</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">🩺</div>
            <div className="text-xs text-slate-400">Medicine</div>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              setPhase('hook');
              setSelectedPrediction(null);
              setShowPredictionFeedback(false);
              setTwistPrediction(null);
              setShowTwistFeedback(false);
              setCompletedApps(new Set());
              setTestAnswers(Array(10).fill(null));
              setTestSubmitted(false);
              setTestIndex(0);
            }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium"
          >
            Explore Again
          </button>
          {onBack && (
            <button
              onClick={() => {
                onGameEvent?.({ type: 'mastery_achieved', data: { game: 'bernoulli_principle' } });
                onBack();
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium"
            >
              Complete Lesson
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );

  // Phase router
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

  // Bottom bar with Back/Next and nav dots
  const currentPhaseIndex = phaseOrder.indexOf(phase);
  const isFirstPhase = currentPhaseIndex === 0;
  const isLastPhase = currentPhaseIndex === phaseOrder.length - 1;
  const canAdvance = !isLastPhase && phase !== 'test';

  const renderBottomBar = () => (
    <div style={{
      flexShrink: 0,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 20px',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(0,0,0,0.3)',
    }}>
      <button
        onClick={() => !isFirstPhase && goToPhase(phaseOrder[currentPhaseIndex - 1])}
        style={{
          padding: '8px 20px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'transparent',
          color: isFirstPhase ? 'rgba(255,255,255,0.3)' : 'white',
          cursor: isFirstPhase ? 'not-allowed' : 'pointer',
          opacity: isFirstPhase ? 0.4 : 1,
          transition: 'all 0.3s ease',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
        }}
      >
        ← Back
      </button>
      <div style={{ display: 'flex', gap: '6px' }}>
        {phaseOrder.map((p, i) => (
          <div
            key={p}
            onClick={() => i <= currentPhaseIndex && goToPhase(p)}
            title={phaseLabels[p]}
            style={{
              width: p === phase ? '20px' : '10px',
              height: '10px',
              borderRadius: '5px',
              background: p === phase ? '#3b82f6' : i < currentPhaseIndex ? '#10b981' : 'rgba(255,255,255,0.2)',
              cursor: i <= currentPhaseIndex ? 'pointer' : 'default',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
      <button
        onClick={() => canAdvance && goToPhase(phaseOrder[currentPhaseIndex + 1])}
        style={{
          padding: '8px 20px',
          borderRadius: '8px',
          border: 'none',
          background: canAdvance ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)',
          color: 'white',
          cursor: canAdvance ? 'pointer' : 'not-allowed',
          opacity: canAdvance ? 1 : 0.4,
          transition: 'all 0.3s ease',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
        }}
      >
        Next →
      </button>
    </div>
  );

  // Main render
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0a0f 0%, #12121a 100%)',
      display: 'flex',
      flexDirection: 'column',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
    }}>
      <style>{`.muted-secondary { color: #94a3b8; } .muted-dim { color: #6B7280; } @keyframes confetti-fall { 0% { transform: translateY(-10px) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } } @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }`}</style>
      {/* Progress bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: colors.bgCard,
        zIndex: 100,
      }}>
        <div style={{
          height: '100%',
          width: `${((currentPhaseIndex + 1) / phaseOrder.length) * 100}%`,
          background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto', paddingTop: '8px' }}>
        {renderPhase()}
      </div>

      {renderBottomBar()}
    </div>
  );
};

export default BernoulliRenderer;
