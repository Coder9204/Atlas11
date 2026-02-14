'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// DRAG FORCE - Premium Design with 10-Phase Learning Structure
// Physics of aerodynamic drag, air resistance, and terminal velocity
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

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// ============================================================================
// REAL-WORLD APPLICATIONS DATA
// ============================================================================

const realWorldApps = [
  {
    icon: '🏎️',
    title: 'Formula 1 Aerodynamics',
    short: 'Racing vehicle design',
    tagline: 'Engineering Speed Through Air Management',
    description: 'Formula 1 cars are the ultimate expression of drag force engineering. Teams spend over $100 million annually on aerodynamic development, using wind tunnels and CFD simulations to shave milliseconds per lap. Every surface is designed to manage airflow for minimum drag and maximum downforce.',
    connection: 'The drag equation F = ½ρv²CdA is the foundation of F1 aerodynamics. At 200+ mph, drag force can exceed 1,500 pounds. Engineers constantly trade drag reduction against downforce generation, optimizing Cd values while maintaining grip through corners.',
    howItWorks: 'F1 cars use complex front and rear wings, bargeboards, and floor diffusers to channel airflow. The front wing creates a pressure curtain that directs air around the wheels (major drag sources). The floor generates 50% of downforce using ground effect. Drag Reduction System (DRS) opens a rear wing slot to reduce drag by 10-15% on straights.',
    stats: [
      { value: '0.7-1.0', label: 'F1 car Cd (with downforce)', icon: '💨' },
      { value: '1,500+ lbs', label: 'Drag at top speed', icon: '⚡' },
      { value: '$150M+', label: 'Annual aero R&D budget', icon: '💰' }
    ],
    examples: [
      'Mercedes\' zero-sidepod design in 2022 minimized frontal area for drag reduction',
      'DRS can add 10-15 km/h on straights by opening a slot in the rear wing',
      'Vortex generators on the floor create low-pressure zones for suction',
      'Teams test over 1,000 aerodynamic configurations per season in wind tunnels'
    ],
    companies: ['Red Bull Racing', 'Mercedes-AMG', 'Ferrari', 'McLaren', 'Aston Martin'],
    futureImpact: 'Active aerodynamics with adjustable surfaces responding in real-time to conditions will become standard. Ground effect floors and tunnel testing will push Cd values lower while maintaining necessary downforce for cornering.',
    color: '#ef4444'
  },
  {
    icon: '🪂',
    title: 'Parachute Engineering',
    short: 'Controlled drag deployment',
    tagline: 'Maximizing Air Resistance for Safe Descent',
    description: 'Parachutes are precision-engineered maximum-drag devices, representing the opposite goal from vehicles. They harness air resistance to slow descent from terminal velocity speeds of 120+ mph to safe landing speeds of 10-15 mph. Modern designs balance stability, control, glide ratio, and reliable deployment under extreme conditions.',
    connection: 'While vehicles minimize the drag equation F = ½ρv²CdA, parachutes maximize it. The massive canopy surface area (A) combined with a high drag coefficient (Cd ≈ 1.5) creates enough force to balance gravitational weight, achieving safe terminal velocities.',
    howItWorks: 'When deployed, the canopy inflates and presents a large cross-sectional area to the airflow. Air molecules impact the fabric, creating enormous pressure drag. Ram-air parachutes use airfoil cells that inflate to create lift as well as drag, enabling forward flight and precision landings. Vents and brake toggles provide stability and steering control.',
    stats: [
      { value: '1.3-1.5', label: 'Typical parachute Cd', icon: '🎯' },
      { value: '120→12 mph', label: 'Speed reduction', icon: '⬇️' },
      { value: '99.97%', label: 'Modern reliability rate', icon: '✅' }
    ],
    examples: [
      'Military round canopies (T-11) are 35 feet diameter for stable vertical descent',
      'Sport ram-air canopies achieve 3:1 glide ratios for precision landing',
      'Drogue chutes stabilize supersonic vehicles before main deployment',
      'SpaceX Crew Dragon uses 4 main chutes with 116 ft combined diameter'
    ],
    companies: ['Airborne Systems', 'Performance Designs', 'Precision Aerodynamics', 'ParaGear', 'Sun Path Products'],
    futureImpact: 'Smart parachutes with GPS guidance systems can land cargo within 50 meters of targets. Steerable cargo systems using autonomous navigation are revolutionizing military resupply and humanitarian aid delivery.',
    color: '#22c55e'
  },
  {
    icon: '🚴',
    title: 'Cycling Aerodynamics',
    short: 'Human-powered efficiency',
    tagline: 'Defeating Air Resistance at Human Scale',
    description: 'At racing speeds above 25 mph, over 90% of a cyclist\'s effort goes to overcoming air resistance. Professional cycling has become an aerodynamic arms race, with every piece of equipment optimized using wind tunnel testing. A 5% drag reduction can mean winning or losing the Tour de France.',
    connection: 'The drag equation reveals why cycling is so sensitive to aerodynamics: drag force scales with v², so doubling speed quadruples the resistance. At 30 mph, a cyclist fights roughly 25 pounds of drag force - more than the weight of their bike.',
    howItWorks: 'Cyclists minimize all three controllable drag factors: frontal area (A) through tucked positions, drag coefficient (Cd) through streamlined equipment, and even air density (ρ) by racing at altitude. Time trial positions can reduce Cd by 30% compared to upright riding. Drafting behind another rider reduces effective air velocity, cutting drag by 20-40%.',
    stats: [
      { value: '90%+', label: 'Effort fighting drag at 30mph', icon: '💪' },
      { value: '0.88', label: 'Elite TT rider CdA (m²)', icon: '📐' },
      { value: '20-40%', label: 'Draft energy savings', icon: '🔋' }
    ],
    examples: [
      'Aero helmets with tail fairings reduce drag by 7% over standard helmets',
      'Deep-section wheels (80mm+) smooth airflow but add crosswind sensitivity',
      'Skinsuit fabric texture is optimized for boundary layer management',
      'Team time trials exploit drafting to maintain speeds 2-3 mph higher than solo efforts'
    ],
    companies: ['Specialized', 'Trek', 'Pinarello', 'Cervélo', 'Canyon'],
    futureImpact: 'Real-time CdA measurement using power meters and speed data allows riders to optimize position during races. New UCI regulations balance innovation against cost barriers to keep competition accessible.',
    color: '#3b82f6'
  },
  {
    icon: '✈️',
    title: 'Commercial Aviation Efficiency',
    short: 'Fuel economy at 35,000 feet',
    tagline: 'Billion-Dollar Drag Reduction',
    description: 'Airlines spend over $200 billion annually on jet fuel. A 1% reduction in drag saves approximately $140 million per year industry-wide. Modern aircraft design obsessively minimizes drag through wing shape, surface smoothness, and innovative technologies like winglets and natural laminar flow.',
    connection: 'At cruise speeds of 550 mph, the drag equation F = ½ρv²CdA produces forces exceeding 10,000 pounds on a 737. Every 1% drag reduction directly translates to 1% fuel savings. With 100,000+ flights daily worldwide, small improvements yield massive economic and environmental benefits.',
    howItWorks: 'Aircraft drag comes from multiple sources: induced drag from lift generation (40%), parasitic drag from skin friction and form (55%), and wave drag near sonic speeds (5%). Winglets reduce induced drag by blocking wingtip vortices. Laminar flow sections maintain smooth airflow longer. Riblets (shark-skin textures) can reduce skin friction by 8%.',
    stats: [
      { value: '0.023-0.027', label: 'Modern airliner Cd', icon: '💨' },
      { value: '$140M/year', label: 'Industry savings per 1% drag cut', icon: '💵' },
      { value: '3-5%', label: 'Winglet fuel savings', icon: '🛫' }
    ],
    examples: [
      'Boeing 787 uses 50% composite materials for smoother surfaces and 20% better efficiency',
      'Split-tip winglets on 737 MAX save 1.8% fuel versus older designs',
      'Shark-skin riblet coatings tested by Lufthansa showed 1% fuel reduction',
      'Continuous descent approaches reduce drag by avoiding level-off segments'
    ],
    companies: ['Boeing', 'Airbus', 'Bombardier', 'Embraer', 'Aviation Partners'],
    futureImpact: 'Hybrid-laminar flow control using suction to delay boundary layer transition could reduce fuel burn by 10%. Blended wing body designs promise 20%+ efficiency gains but require airport infrastructure changes.',
    color: '#8b5cf6'
  }
];

// ============================================================================
// TEST QUESTIONS DATA - 10 Scenario-Based Questions
// ============================================================================

const testQuestions = [
  {
    scenario: 'A cyclist is riding at 20 mph and decides to increase speed to 40 mph. They notice it becomes dramatically harder to pedal.',
    question: 'How much more power must the cyclist produce to maintain 40 mph compared to 20 mph?',
    options: [
      { id: 'a', label: 'Twice as much power (2x)' },
      { id: 'b', label: 'Four times as much power (4x)' },
      { id: 'c', label: 'Eight times as much power (8x)', correct: true },
      { id: 'd', label: 'Sixteen times as much power (16x)' }
    ],
    explanation: 'Power to overcome drag scales with velocity cubed (P = Fd × v = ½ρv²CdA × v = ½ρv³CdA). Doubling speed means 2³ = 8 times the power required. This is why maintaining high speeds is so energy-intensive.'
  },
  {
    scenario: 'A skydiver jumps from 15,000 feet. After the initial acceleration, they notice their speedometer stabilizes at 120 mph despite continuing to fall.',
    question: 'Why does the skydiver stop accelerating even though gravity is still pulling them down?',
    options: [
      { id: 'a', label: 'They have reached maximum gravitational speed' },
      { id: 'b', label: 'The air becomes too thick to fall faster' },
      { id: 'c', label: 'Drag force has increased to equal their weight, resulting in zero net force', correct: true },
      { id: 'd', label: 'Wind resistance creates an upward lift force' }
    ],
    explanation: 'As velocity increases, drag force (F = ½ρv²CdA) grows until it equals the gravitational force (weight). At this point, net force is zero (ΣF = 0), so acceleration is zero by Newton\'s second law. This constant velocity is called terminal velocity.'
  },
  {
    scenario: 'Two identical cars are driving: one at sea level and one at 10,000 feet elevation in the mountains where air is 30% less dense.',
    question: 'How does the drag force on the mountain car compare to the sea-level car at the same speed?',
    options: [
      { id: 'a', label: '30% less drag force', correct: true },
      { id: 'b', label: '30% more drag force' },
      { id: 'c', label: 'Same drag force - altitude doesn\'t matter' },
      { id: 'd', label: '60% less drag force due to reduced air pressure' }
    ],
    explanation: 'Drag force is directly proportional to air density (ρ) in the equation F = ½ρv²CdA. If air density decreases by 30%, drag force decreases by 30%. This is why land speed records are often attempted at high altitude salt flats like Bonneville.'
  },
  {
    scenario: 'A golf ball manufacturer creates a perfectly smooth ball to reduce friction. Surprisingly, it travels only half as far as a dimpled ball.',
    question: 'Why do dimples make a golf ball travel farther despite adding surface roughness?',
    options: [
      { id: 'a', label: 'Dimples store compressed air that provides thrust' },
      { id: 'b', label: 'Dimples reduce the ball\'s weight' },
      { id: 'c', label: 'Dimples create turbulent boundary layer that delays flow separation and reduces pressure drag', correct: true },
      { id: 'd', label: 'Dimples increase spin rate for more Magnus effect' }
    ],
    explanation: 'A smooth ball has laminar flow that separates early, creating a large turbulent wake and high pressure drag. Dimples trigger transition to a turbulent boundary layer that clings to the surface longer, reducing the wake size. This counterintuitively reduces overall drag by up to 50%.'
  },
  {
    scenario: 'An engineer designs two spacecraft heat shields: one flat and one cone-shaped. Both have the same diameter base.',
    question: 'Which heat shield shape experiences more drag during atmospheric re-entry, and why is this beneficial?',
    options: [
      { id: 'a', label: 'The flat shield has more drag, which is bad because it slows the vehicle too much' },
      { id: 'b', label: 'The cone has more drag because it has more surface area' },
      { id: 'c', label: 'The flat shield has more drag, which is beneficial for maximum deceleration and heating spread', correct: true },
      { id: 'd', label: 'Both have equal drag since they have the same diameter' }
    ],
    explanation: 'The flat shield (Cd ≈ 1.2) has much higher drag than a cone (Cd ≈ 0.5). Higher drag is actually beneficial for re-entry: it maximizes deceleration in the upper atmosphere where the vehicle can radiate heat away, preventing the shield from overheating in denser air below.'
  },
  {
    scenario: 'A truck driver notices fuel economy drops from 8 mpg to 6 mpg when driving with an empty flatbed versus hauling a streamlined cargo container.',
    question: 'How does the empty flatbed create more drag than a container that adds weight and size?',
    options: [
      { id: 'a', label: 'The container\'s weight pushes the truck lower for better ground effect' },
      { id: 'b', label: 'The empty flatbed creates turbulent separation and a large low-pressure wake behind the cab', correct: true },
      { id: 'c', label: 'The container generates thrust as air flows around it' },
      { id: 'd', label: 'Empty flatbeds attract more wind due to electromagnetic effects' }
    ],
    explanation: 'Without cargo, air separates violently at the back of the cab creating a massive turbulent wake with very low pressure. This pressure drag can be 50% of total truck drag. A container fills this gap, allowing air to flow smoothly off the back and significantly reducing the pressure differential.'
  },
  {
    scenario: 'During the 2012 Olympics, US swimmers wore full-body suits that were later banned. The suits reduced drag by 5% compared to traditional swimwear.',
    question: 'Why is a 5% drag reduction so significant in competitive swimming?',
    options: [
      { id: 'a', label: 'Swimming is very slow, so any reduction feels significant' },
      { id: 'b', label: 'Water is 800x denser than air, so even small drag reductions save substantial energy', correct: true },
      { id: 'c', label: 'The suits also reduced body weight' },
      { id: 'd', label: '5% improvement is unusual in any sport' }
    ],
    explanation: 'Water density (ρ ≈ 1000 kg/m³) is about 800 times that of air (ρ ≈ 1.2 kg/m³). In the drag equation F = ½ρv²CdA, this means swimmers face enormous resistance. A 5% drag reduction translates to significant time savings when races are won by hundredths of seconds.'
  },
  {
    scenario: 'A wildlife documentary shows a peregrine falcon diving at 240 mph to catch prey, making it the fastest animal on Earth.',
    question: 'How does the falcon achieve such extreme speeds compared to other birds?',
    options: [
      { id: 'a', label: 'Falcons have more powerful muscles than other birds' },
      { id: 'b', label: 'Falcons dive from higher altitudes where gravity is stronger' },
      { id: 'c', label: 'Falcons tuck their wings to minimize frontal area and drag coefficient during the stoop', correct: true },
      { id: 'd', label: 'Falcons have special feathers that eliminate air resistance' }
    ],
    explanation: 'During a stoop (hunting dive), falcons fold their wings tight against their body, reducing both frontal area (A) and drag coefficient (Cd) dramatically. This teardrop shape has Cd ≈ 0.04-0.08, among the lowest of any animal. Combined with gravity, this allows acceleration to speeds impossible in level flight.'
  },
  {
    scenario: 'NASCAR teams noticed that cars drafting closely behind the leader can sometimes achieve higher top speeds than the leading car itself.',
    question: 'What aerodynamic phenomenon allows a trailing car to be faster than the leader?',
    options: [
      { id: 'a', label: 'The trailing car\'s engine runs more efficiently in cleaner air' },
      { id: 'b', label: 'The leading car creates a low-pressure wake that both reduces drag on the trailing car AND pulls the leader back', correct: true },
      { id: 'c', label: 'The trailing car weighs less due to fuel consumption' },
      { id: 'd', label: 'Track surface is smoother in the racing line' }
    ],
    explanation: 'The leader pushes through undisturbed air, creating a turbulent low-pressure wake. The trailing car sits in this zone with reduced relative air velocity and less drag. Additionally, the trailing car\'s high-pressure bow wave pushes forward on the leader\'s low-pressure wake, actually creating a small "push" effect that helps both cars.'
  },
  {
    scenario: 'The Bloodhound LSR car attempting the land speed record uses both a jet engine and a rocket, yet most of its power at 1,000 mph goes to overcoming air resistance.',
    question: 'At 1,000 mph, approximately how does drag force scale compared to a car driving at 100 mph (with the same Cd and A)?',
    options: [
      { id: 'a', label: '10 times the drag force' },
      { id: 'b', label: '50 times the drag force' },
      { id: 'c', label: '100 times the drag force', correct: true },
      { id: 'd', label: '1,000 times the drag force' }
    ],
    explanation: 'Drag force scales with velocity squared: F = ½ρv²CdA. At 10 times the velocity (1,000 vs 100 mph), drag increases by 10² = 100 times. This is why land speed record cars need tens of thousands of horsepower - almost all of it just to push through the air.'
  }
];

const DragForceRenderer: React.FC<Props> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [expandedApp, setExpandedApp] = useState<number | null>(null);

  // Simulation states
  const [velocity, setVelocity] = useState(20);
  const [surfaceArea, setSurfaceArea] = useState(0.5);
  const [dragCoefficient, setDragCoefficient] = useState(0.5);
  const [isSimulating, setIsSimulating] = useState(false);
  const [objectY, setObjectY] = useState(50);
  const [currentVelocity, setCurrentVelocity] = useState(0);
  const [currentDrag, setCurrentDrag] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showVectors, setShowVectors] = useState(true);

  // Terminal velocity simulation
  const [terminalObjects, setTerminalObjects] = useState<{y: number; v: number; terminal: number; reached: boolean}[]>([]);
  const [showTerminalSim, setShowTerminalSim] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Premium Design System
  const colors = {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    accent: '#f97316',
    secondary: '#8b5cf6',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    bgDark: '#020617',
    bgCard: '#0f172a',
    bgCardLight: '#1e293b',
    textPrimary: '#f8fafc',
    textSecondary: '#e2e8f0', // High contrast text for accessibility
    textMuted: '#cbd5e1',
    border: '#334155',
    borderLight: '#475569',
    dragForce: '#ef4444',
    velocity: '#22c55e',
    terminal: '#f59e0b',
  };

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

  // Sync with external phase control
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Reset test on entry
  useEffect(() => {
    if (phase === 'test') {
      setTestAnswers(Array(10).fill(-1));
      setTestScore(0);
      setShowTestResults(false);
    }
  }, [phase]);

  // Event emitter
  const emit = useCallback((type: string, details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      type,
      gameType: 'drag_force',
      gameTitle: 'Drag Force',
      details: { phase, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase]);

  // Web Audio API sound system
  const playSound = useCallback((soundType: 'click' | 'correct' | 'incorrect' | 'complete') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      switch (soundType) {
        case 'click':
          oscillator.frequency.setValueAtTime(440, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
          break;
        case 'correct':
          oscillator.frequency.setValueAtTime(523, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'incorrect':
          oscillator.frequency.setValueAtTime(200, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.25);
          break;
        case 'complete':
          oscillator.frequency.setValueAtTime(523, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
          oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.45);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.6);
          break;
      }
    } catch {
      // Audio not available
    }
  }, []);

  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('click');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    emit('phase_change', { phase: newPhase, phaseLabel: phaseLabels[newPhase] });
  }, [playSound, onPhaseComplete, emit]);

  // Drag force simulation for play phase
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setObjectY(prev => {
        const mass = 5;
        const g = 9.8;
        const gravity = mass * g;
        const airDensity = 1.2;

        const dragForce = 0.5 * airDensity * currentVelocity * currentVelocity * dragCoefficient * surfaceArea;
        const netForce = gravity - dragForce;
        const acceleration = netForce / mass;

        const newVelocity = currentVelocity + acceleration * 0.05;
        setCurrentVelocity(Math.max(0, newVelocity));
        setCurrentDrag(dragForce);
        setTimeElapsed(t => t + 0.05);

        const newY = prev + newVelocity * 0.3;

        if (newY >= 340) {
          setIsSimulating(false);
          return 340;
        }

        return newY;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isSimulating, currentVelocity, dragCoefficient, surfaceArea]);

  // Terminal velocity simulation for twist_play phase
  useEffect(() => {
    if (!showTerminalSim) return;

    const interval = setInterval(() => {
      setTerminalObjects(prev => prev.map(obj => {
        if (obj.y >= 320) return obj;

        const mass = 70;
        const g = 9.8;
        const gravity = mass * g;
        const airDensity = 1.2;
        const area = obj.terminal > 50 ? 0.3 : 0.8;
        const cd = obj.terminal > 50 ? 0.4 : 1.0;

        const dragForce = 0.5 * airDensity * obj.v * obj.v * cd * area;
        const netForce = gravity - dragForce;
        const acceleration = netForce / mass;

        const newV = obj.v + acceleration * 0.05;
        const newY = obj.y + newV * 0.15;
        const reached = Math.abs(acceleration) < 0.5 || obj.reached;

        return { y: Math.min(320, newY), v: newV, terminal: obj.terminal, reached };
      }));
    }, 50);

    return () => clearInterval(interval);
  }, [showTerminalSim]);

  const startSimulation = useCallback(() => {
    setObjectY(50);
    setCurrentVelocity(velocity);
    setCurrentDrag(0);
    setTimeElapsed(0);
    setIsSimulating(true);
  }, [velocity]);

  const resetSimulation = useCallback(() => {
    setIsSimulating(false);
    setObjectY(50);
    setCurrentVelocity(0);
    setCurrentDrag(0);
    setTimeElapsed(0);
  }, []);

  const startTerminalSim = useCallback(() => {
    setTerminalObjects([
      { y: 50, v: 0, terminal: 55, reached: false },
      { y: 50, v: 0, terminal: 70, reached: false }
    ]);
    setShowTerminalSim(true);
  }, []);

  const resetTerminalSim = useCallback(() => {
    setShowTerminalSim(false);
    setTerminalObjects([]);
  }, []);

  const handlePrediction = useCallback((prediction: string) => {
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'correct' : 'incorrect');
    emit('prediction_made', { prediction, correct: prediction === 'B' });
  }, [playSound, emit]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'correct' : 'incorrect');
    emit('twist_prediction_made', { prediction, correct: prediction === 'C' });
  }, [playSound, emit]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);
    emit('test_answered', { question: questionIndex, answer: answerIndex });
  }, [testAnswers, emit]);

  const calculateScore = useCallback(() => {
    let score = 0;
    testAnswers.forEach((answer, index) => {
      const options = testQuestions[index]?.options;
      if (options && options[answer]?.correct) score++;
    });
    return score;
  }, [testAnswers]);

  const handleSubmitTest = useCallback(() => {
    const score = calculateScore();
    setTestScore(score);
    setShowTestResults(true);
    playSound(score >= 7 ? 'complete' : 'incorrect');
    emit('test_completed', { score, total: 10 });
  }, [calculateScore, playSound, emit]);

  const handleAppComplete = useCallback((appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    emit('app_explored', { app: appIndex });
  }, [playSound, emit]);

  const renderPhaseContent = () => {
    switch (phase) {
      // ========== HOOK PHASE ==========
      case 'hook':
        return (
          <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/10 border border-sky-500/20 rounded-full mb-8">
              <span className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-sky-400 tracking-wide">FLUID DYNAMICS</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-sky-100 to-cyan-200 bg-clip-text text-transparent">
              Drag Force
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-8 leading-relaxed">
              The invisible wall that fights every object moving through air
            </p>

            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-6 max-w-2xl border border-slate-700/50 shadow-2xl shadow-sky-500/5 mb-8">
              <div className="text-left mb-6">
                <h2 className="text-xl font-bold text-cyan-400 mb-3">Think About This...</h2>
                <p className="text-lg text-slate-300 leading-relaxed mb-4">
                  A Formula 1 car produces over <span className="text-yellow-400 font-bold">1,000 horsepower</span>,
                  yet at top speed, <span className="text-red-400 font-bold">90% of that power</span> goes
                  to just pushing through the air.
                </p>
                <p className="text-lg text-slate-300 leading-relaxed mb-4">
                  Meanwhile, a skydiver falling from 15,000 feet somehow
                  <span className="text-green-400 font-bold"> stops accelerating</span> despite gravity
                  constantly pulling them down.
                </p>
                <p className="text-xl text-cyan-300 font-medium">
                  What invisible force is stealing that horsepower and stopping the skydiver?
                </p>
              </div>

              <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gradient-to-b from-sky-900/30 to-slate-900/50">
                <svg viewBox="0 0 400 200" className="w-full h-full">
                  <defs>
                    <linearGradient id="hookAirGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
                      <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                    </linearGradient>
                    <radialGradient id="hookCarGrad" cx="50%" cy="40%" r="50%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#991b1b" />
                    </radialGradient>
                  </defs>

                  {/* Animated airflow lines */}
                  {[40, 80, 120, 160].map((y, i) => (
                    <line key={i} x1="0" y1={y} x2="400" y2={y} stroke="url(#hookAirGrad)" strokeWidth="2" strokeDasharray="20,10">
                      <animate attributeName="stroke-dashoffset" from="0" to="-30" dur={`${0.5 + i * 0.1}s`} repeatCount="indefinite" />
                    </line>
                  ))}

                  {/* Simplified race car */}
                  <g transform="translate(180, 100)">
                    <ellipse cx="0" cy="0" rx="50" ry="20" fill="url(#hookCarGrad)" />
                    <ellipse cx="-30" cy="20" rx="12" ry="12" fill="#1f2937" />
                    <ellipse cx="30" cy="20" rx="12" ry="12" fill="#1f2937" />
                    <path d="M-20,-15 L0,-30 L25,-15" fill="#0ea5e9" opacity="0.8" />
                  </g>

                  {/* Drag force arrow */}
                  <g>
                    <line x1="280" y1="100" x2="350" y2="100" stroke="#ef4444" strokeWidth="4">
                      <animate attributeName="stroke-opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
                    </line>
                    <polygon points="350,100 340,94 340,106" fill="#ef4444">
                      <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
                    </polygon>
                    <text x="315" y="85" fill="#ef4444" fontSize="14" fontWeight="bold" textAnchor="middle">DRAG</text>
                  </g>
                </svg>
              </div>
            </div>

            <button
              onClick={() => goToPhase('predict')}
              style={{ minHeight: '44px' }}
              className="group px-8 py-4 bg-gradient-to-r from-sky-600 to-cyan-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                Make a Prediction
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
          </div>
        );

      // ========== PREDICT PHASE ==========
      case 'predict':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-sky-400 mb-2">Make Your Prediction</h2>
            <p style={{ color: '#e2e8f0' }} className="mb-2 text-center">Test your intuition about air resistance</p>

            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-6">
              <span style={{ color: '#e2e8f0' }} className="text-sm">Step 1 of 2: Make prediction</span>
              <div className="flex gap-1">
                <div className={`w-2 h-2 rounded-full ${selectedPrediction ? 'bg-green-500' : 'bg-sky-500'}`} />
                <div className={`w-2 h-2 rounded-full ${showPredictionFeedback ? 'bg-green-500' : 'bg-slate-600'}`} />
              </div>
            </div>

            {/* Static SVG diagram */}
            <div className="w-full max-w-md h-40 mb-6 rounded-xl overflow-hidden bg-gradient-to-b from-sky-900/30 to-slate-900/50 border border-slate-700/50">
              <svg viewBox="0 0 400 160" className="w-full h-full" role="img" aria-label="Drag force diagram showing car and air resistance">
                <defs>
                  <linearGradient id="predictAirGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
                    <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Road */}
                <rect x="0" y="120" width="400" height="40" fill="#374151" />
                <line x1="0" y1="140" x2="400" y2="140" stroke="#fbbf24" strokeWidth="2" strokeDasharray="20,10" />
                {/* Car body */}
                <rect x="100" y="85" width="80" height="30" rx="5" fill="#3b82f6" />
                <rect x="115" y="70" width="50" height="20" rx="3" fill="#60a5fa" />
                {/* Wheels */}
                <circle cx="120" cy="115" r="10" fill="#1f2937" />
                <circle cx="160" cy="115" r="10" fill="#1f2937" />
                {/* Air flow lines */}
                {[60, 80, 100].map((y, i) => (
                  <line key={i} x1="200" y1={y} x2="350" y2={y} stroke="url(#predictAirGrad)" strokeWidth="2" strokeDasharray="8,4" />
                ))}
                {/* Drag arrow */}
                <line x1="200" y1="95" x2="280" y2="95" stroke="#ef4444" strokeWidth="4" />
                <polygon points="280,95 270,89 270,101" fill="#ef4444" />
                <text x="240" y="85" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">Drag Force</text>
                {/* Velocity arrow */}
                <line x1="100" y1="95" x2="50" y2="95" stroke="#22c55e" strokeWidth="4" />
                <polygon points="50,95 60,89 60,101" fill="#22c55e" />
                <text x="75" y="85" fill="#22c55e" fontSize="12" fontWeight="bold" textAnchor="middle">v</text>
              </svg>
            </div>

            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 rounded-xl mb-6 max-w-lg border border-slate-700/50">
              <p style={{ color: '#e2e8f0' }} className="text-lg mb-4">
                A car is driving on the highway at <span className="text-cyan-400 font-bold">30 mph</span>.
                The driver accelerates to <span className="text-yellow-400 font-bold">60 mph</span> (doubling their speed).
              </p>
              <p className="text-xl text-cyan-300 text-center font-bold">
                What happens to the drag force pushing against the car?
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'A', text: 'Drag force doubles (2x)' },
                { id: 'B', text: 'Drag force quadruples (4x)' },
                { id: 'C', text: 'Drag force stays the same' },
                { id: 'D', text: 'Drag force increases by 50%' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => handlePrediction(option.id)}
                  disabled={showPredictionFeedback}
                  style={{ minHeight: '44px' }}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showPredictionFeedback && option.id === 'B'
                      ? 'bg-green-600 text-white border-2 border-green-400'
                      : showPredictionFeedback && selectedPrediction === option.id
                      ? 'bg-red-600 text-white'
                      : selectedPrediction === option.id
                      ? 'bg-sky-600 text-white border-2 border-sky-400 ring-2 ring-sky-400'
                      : 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <span className="font-bold text-lg mr-2">{option.id}.</span> {option.text}
                </button>
              ))}
            </div>

            {showPredictionFeedback && (
              <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-6 rounded-xl max-w-md border border-slate-700/50">
                <p className={`text-xl font-bold mb-3 ${selectedPrediction === 'B' ? 'text-green-400' : 'text-sky-400'}`}>
                  {selectedPrediction === 'B' ? 'Exactly Right!' : 'Surprising, isn\'t it?'}
                </p>
                <p style={{ color: '#e2e8f0' }} className="mb-3">
                  Drag force depends on velocity <span className="text-yellow-400 font-bold">squared</span>!
                </p>
                <div className="bg-slate-900/50 p-3 rounded-lg mb-4">
                  <p className="font-mono text-sky-400 text-center text-lg">
                    F<sub>drag</sub> = ½ρ<span className="text-yellow-400">v²</span>C<sub>d</sub>A
                  </p>
                  <p style={{ color: '#e2e8f0' }} className="text-sm text-center mt-2">
                    Double velocity = 2² = <span className="text-green-400 font-bold">4x the drag!</span>
                  </p>
                </div>
                <button
                  onClick={() => goToPhase('play')}
                  style={{ minHeight: '44px' }}
                  className="w-full px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-all"
                >
                  Explore in the Simulator
                </button>
              </div>
            )}
          </div>
        );

      // ========== PLAY PHASE ==========
      case 'play':
        const airDensity = 1.2;
        const calculatedDrag = 0.5 * airDensity * velocity * velocity * dragCoefficient * surfaceArea;

        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-sky-400 mb-2">Drag Force Laboratory</h2>
            <p style={{ color: '#e2e8f0' }} className="mb-2">Experiment with the variables that affect drag</p>

            {/* Observation guidance */}
            <div className="bg-sky-900/30 border border-sky-500/30 rounded-lg px-4 py-2 mb-4 max-w-lg">
              <p style={{ color: '#e2e8f0' }} className="text-sm text-center">
                <span className="font-bold text-sky-400">Observe:</span> Watch how changing velocity, area, and drag coefficient affects the falling object. Notice how drag force grows with velocity squared.
              </p>
            </div>

            <div className="relative w-full max-w-lg h-80 bg-gradient-to-b from-sky-400/20 to-sky-900/40 rounded-xl mb-4 overflow-hidden border border-slate-700/50">
              <svg viewBox="0 0 400 400" className="w-full h-full">
                <defs>
                  <linearGradient id="dragSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#87ceeb" stopOpacity="0.5" />
                    <stop offset="50%" stopColor="#3d7a9e" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.7" />
                  </linearGradient>
                  <linearGradient id="dragGroundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4a7c44" />
                    <stop offset="100%" stopColor="#1e4a1a" />
                  </linearGradient>
                  <radialGradient id="dragObjectGrad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#ffaa44" />
                    <stop offset="100%" stopColor="#aa4400" />
                  </radialGradient>
                </defs>

                <rect x="0" y="0" width="400" height="400" fill="url(#dragSkyGrad)" />
                <rect x="0" y="360" width="400" height="40" fill="url(#dragGroundGrad)" />

                {/* Air flow lines when simulating */}
                {isSimulating && (
                  <g opacity="0.6">
                    {[80, 140, 200, 260, 320].map((xPos, i) => (
                      <line key={i} x1={xPos} y1={objectY - 60} x2={xPos} y2={objectY + 30}
                        stroke="#38bdf8" strokeWidth="2" strokeDasharray="8,4">
                        <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="0.5s" repeatCount="indefinite" />
                      </line>
                    ))}
                  </g>
                )}

                {/* Falling object */}
                <g transform={`translate(200, ${objectY})`}>
                  <ellipse cx="3" cy="3" rx={15 + surfaceArea * 20} ry={10 + surfaceArea * 10} fill="rgba(0,0,0,0.3)" />
                  <ellipse cx="0" cy="0" rx={15 + surfaceArea * 20} ry={10 + surfaceArea * 10} fill="url(#dragObjectGrad)" stroke="#aa4400" strokeWidth="2" />
                </g>

                {/* Force vectors */}
                {showVectors && objectY < 340 && (
                  <>
                    {/* Weight arrow */}
                    <line x1="200" y1={objectY + 25} x2="200" y2={objectY + 65} stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />
                    <polygon points={`200,${objectY + 72} 193,${objectY + 60} 207,${objectY + 60}`} fill="#ef4444" />

                    {/* Drag arrow */}
                    {currentDrag > 0 && (
                      <>
                        <line x1="200" y1={objectY - 20} x2="200" y2={objectY - 20 - Math.min(currentDrag / 10, 50)}
                          stroke="#22c55e" strokeWidth="5" strokeLinecap="round" />
                        <polygon points={`200,${objectY - 27 - Math.min(currentDrag / 10, 50)} 193,${objectY - 15 - Math.min(currentDrag / 10, 50)} 207,${objectY - 15 - Math.min(currentDrag / 10, 50)}`}
                          fill="#22c55e" />
                      </>
                    )}
                  </>
                )}

                {/* Data panel */}
                <rect x="10" y="10" width="160" height="110" fill="rgba(0,0,0,0.7)" rx="8" />
              </svg>

              {/* Data labels */}
              <div className="absolute top-5 left-5 text-sm space-y-1">
                <div className="text-white">Speed: <span className="text-green-400 font-bold">{currentVelocity.toFixed(1)} m/s</span></div>
                <div className="text-white">Drag: <span className="text-emerald-400 font-bold">{currentDrag.toFixed(1)} N</span></div>
                <div className="text-white">Time: <span className="font-bold">{timeElapsed.toFixed(1)}s</span></div>
                <div className="text-slate-400 text-xs">Predicted: {calculatedDrag.toFixed(1)} N</div>
              </div>

              {showVectors && objectY < 340 && (
                <>
                  <div className="absolute text-xs font-bold text-red-400" style={{ left: '52%', top: `${(objectY + 50) / 4 + 5}%` }}>Weight</div>
                  {currentDrag > 0 && (
                    <div className="absolute text-xs font-bold text-green-400" style={{ left: '52%', top: `${(objectY - 35) / 4 + 5}%` }}>Drag</div>
                  )}
                </>
              )}
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-lg mb-4">
              <div className="bg-slate-800 p-3 rounded-lg">
                <label className="text-sm text-slate-400">Initial Velocity (m/s)</label>
                <input type="range" min="5" max="50" value={velocity} onChange={(e) => setVelocity(Number(e.target.value))} className="w-full mt-1" />
                <span className="text-sky-400 font-bold">{velocity}</span>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <label className="text-sm text-slate-400">Surface Area (m²)</label>
                <input type="range" min="0.1" max="1.5" step="0.1" value={surfaceArea} onChange={(e) => setSurfaceArea(Number(e.target.value))} className="w-full mt-1" />
                <span className="text-sky-400 font-bold">{surfaceArea.toFixed(1)}</span>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <label className="text-sm text-slate-400">Drag Coefficient</label>
                <input type="range" min="0.1" max="1.5" step="0.1" value={dragCoefficient} onChange={(e) => setDragCoefficient(Number(e.target.value))} className="w-full mt-1" />
                <span className="text-sky-400 font-bold">{dragCoefficient.toFixed(1)}</span>
              </div>
            </div>

            <div className="flex gap-3 mb-4">
              <button onClick={startSimulation} disabled={isSimulating}
                style={{ minHeight: '44px' }}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-bold rounded-xl">
                {isSimulating ? 'Falling...' : 'Drop Object'}
              </button>
              <button onClick={resetSimulation}
                style={{ minHeight: '44px' }}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-xl">
                Reset
              </button>
              <label className="flex items-center gap-2" style={{ color: '#e2e8f0' }}>
                <input type="checkbox" checked={showVectors} onChange={(e) => setShowVectors(e.target.checked)} />
                Forces
              </label>
            </div>

            <button onClick={() => goToPhase('review')}
              style={{ minHeight: '44px' }}
              className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl">
              Review the Physics
            </button>
          </div>
        );

      // ========== REVIEW PHASE ==========
      case 'review':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-sky-400 mb-6">The Physics of Drag Force</h2>

            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 rounded-xl max-w-2xl mb-6 border border-slate-700/50">
              <h3 className="text-xl font-bold text-cyan-400 mb-4 text-center">The Drag Equation</h3>
              <div className="bg-slate-900 p-4 rounded-lg text-center mb-4">
                <span className="text-2xl font-mono text-sky-400">F<sub>drag</sub> = ½ρv²C<sub>d</sub>A</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-cyan-400 font-bold">ρ (rho)</span>
                  <p className="text-slate-300">Air density (kg/m³)</p>
                  <p className="text-slate-500">~1.2 at sea level, less at altitude</p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg border border-yellow-500/30">
                  <span className="text-yellow-400 font-bold">v² (velocity squared)</span>
                  <p className="text-slate-300">THE key factor!</p>
                  <p className="text-slate-500">Double speed = 4x drag</p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-green-400 font-bold">C<sub>d</sub> (drag coefficient)</span>
                  <p className="text-slate-300">Shape efficiency</p>
                  <p className="text-slate-500">Teardrop: 0.04, Cube: 1.05</p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-purple-400 font-bold">A (frontal area)</span>
                  <p className="text-slate-300">Cross-section facing flow</p>
                  <p className="text-slate-500">Bigger = more drag</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 p-4 rounded-xl max-w-lg mb-6 border border-yellow-500/30">
              <h4 className="font-bold text-yellow-400 mb-2">The Power Problem</h4>
              <p className="text-slate-300 text-sm mb-3">
                Power to overcome drag scales with <span className="text-yellow-400">v³</span> (velocity cubed)!
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-800/50 p-2 rounded">
                  <div className="text-slate-400">30 mph</div>
                  <div className="text-green-400 font-bold">1x power</div>
                </div>
                <div className="bg-slate-800/50 p-2 rounded">
                  <div className="text-slate-400">60 mph</div>
                  <div className="text-yellow-400 font-bold">8x power</div>
                </div>
                <div className="bg-slate-800/50 p-2 rounded">
                  <div className="text-slate-400">90 mph</div>
                  <div className="text-red-400 font-bold">27x power</div>
                </div>
              </div>
            </div>

            <button onClick={() => goToPhase('twist_predict')}
              style={{ minHeight: '44px' }}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl">
              Ready for the Twist?
            </button>
          </div>
        );

      // ========== TWIST PREDICT PHASE ==========
      case 'twist_predict':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-2">The Twist: Terminal Velocity</h2>
            <p style={{ color: '#e2e8f0' }} className="mb-2">Something strange happens when objects fall...</p>

            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-6">
              <span style={{ color: '#e2e8f0' }} className="text-sm">Step 1 of 2: Make prediction</span>
              <div className="flex gap-1">
                <div className={`w-2 h-2 rounded-full ${twistPrediction ? 'bg-green-500' : 'bg-purple-500'}`} />
                <div className={`w-2 h-2 rounded-full ${showTwistFeedback ? 'bg-green-500' : 'bg-slate-600'}`} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 p-6 rounded-xl mb-6 max-w-lg border border-purple-500/30">
              <p style={{ color: '#e2e8f0' }} className="mb-4">
                A skydiver jumps from 15,000 feet. They accelerate faster and faster...
                but after about 12 seconds, their speedometer stops increasing. They fall the rest of the way at a
                <span className="text-purple-400 font-bold"> constant 120 mph</span>.
              </p>
              <p className="text-xl text-cyan-300 text-center font-bold">
                If gravity never stops pulling, why do they stop accelerating?
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'A', text: 'Gravity gets weaker as they fall' },
                { id: 'B', text: 'Air pressure pushes up on them' },
                { id: 'C', text: 'Drag force grows until it equals their weight' },
                { id: 'D', text: 'They run out of gravitational potential energy' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => handleTwistPrediction(option.id)}
                  disabled={showTwistFeedback}
                  style={{ minHeight: '44px' }}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showTwistFeedback && option.id === 'C'
                      ? 'bg-green-600 text-white border-2 border-green-400'
                      : showTwistFeedback && twistPrediction === option.id
                      ? 'bg-red-600 text-white'
                      : twistPrediction === option.id
                      ? 'bg-purple-600 text-white border-2 border-purple-400 ring-2 ring-purple-400'
                      : 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                  }`}
                >
                  <span className="font-bold">{option.id}.</span> {option.text}
                </button>
              ))}
            </div>

            {showTwistFeedback && (
              <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-6 rounded-xl max-w-md border border-slate-700/50">
                <p className={`text-xl font-bold mb-3 ${twistPrediction === 'C' ? 'text-green-400' : 'text-purple-400'}`}>
                  {twistPrediction === 'C' ? 'Excellent reasoning!' : 'Great thinking!'}
                </p>
                <p style={{ color: '#e2e8f0' }} className="mb-3">
                  As speed increases, drag force (proportional to v²) grows rapidly.
                  Eventually, drag equals the skydiver&apos;s weight.
                </p>
                <p style={{ color: '#e2e8f0' }} className="mb-4">
                  When F<sub>drag</sub> = Weight, net force = 0, so acceleration = 0.
                  This is <span className="text-yellow-400 font-bold">terminal velocity</span>.
                </p>
                <button onClick={() => goToPhase('twist_play')}
                  style={{ minHeight: '44px' }}
                  className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl">
                  See It In Action
                </button>
              </div>
            )}
          </div>
        );

      // ========== TWIST PLAY PHASE ==========
      case 'twist_play':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-2">Terminal Velocity Race</h2>
            <p style={{ color: '#e2e8f0' }} className="mb-2">Watch how body position affects falling speed</p>

            {/* Observation guidance */}
            <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg px-4 py-2 mb-4 max-w-lg">
              <p style={{ color: '#e2e8f0' }} className="text-sm text-center">
                <span className="font-bold text-purple-400">Observe:</span> Compare how the spread-eagle and tucked positions reach different terminal velocities. The larger cross-section creates more drag.
              </p>
            </div>

            <div className="relative w-full max-w-lg h-80 bg-gradient-to-b from-sky-400/20 to-sky-900/40 rounded-xl mb-4 overflow-hidden border border-slate-700/50">
              <svg viewBox="0 0 400 400" className="w-full h-full">
                <defs>
                  <linearGradient id="termSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#87ceeb" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.7" />
                  </linearGradient>
                  <radialGradient id="spreadGrad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#15803d" />
                  </radialGradient>
                  <radialGradient id="tuckedGrad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#fb923c" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </radialGradient>
                </defs>

                <rect x="0" y="0" width="400" height="400" fill="url(#termSkyGrad)" />
                <rect x="0" y="360" width="400" height="40" fill="#2d5a27" />

                {terminalObjects.length >= 2 && (
                  <>
                    {/* Spread eagle skydiver */}
                    <g transform={`translate(120, ${terminalObjects[0].y})`}>
                      <ellipse cx="0" cy="0" rx="25" ry="12" fill="url(#spreadGrad)" stroke="#15803d" strokeWidth="1" />
                      <circle cx="0" cy="-15" r="10" fill="#374151" />
                      <line x1="-25" y1="0" x2="-48" y2="-8" stroke="url(#spreadGrad)" strokeWidth="6" strokeLinecap="round" />
                      <line x1="25" y1="0" x2="48" y2="-8" stroke="url(#spreadGrad)" strokeWidth="6" strokeLinecap="round" />
                      <line x1="-10" y1="12" x2="-25" y2="32" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" />
                      <line x1="10" y1="12" x2="25" y2="32" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" />
                    </g>

                    {/* Tucked skydiver */}
                    <g transform={`translate(280, ${terminalObjects[1].y})`}>
                      <ellipse cx="0" cy="0" rx="12" ry="22" fill="url(#tuckedGrad)" stroke="#ea580c" strokeWidth="1" />
                      <circle cx="0" cy="-20" r="10" fill="#374151" />
                    </g>
                  </>
                )}
              </svg>

              {/* Labels */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-16">
                <div className="text-sm font-bold text-green-400 text-center">Spread Eagle</div>
                <div className="text-sm font-bold text-orange-400 text-center">Tucked</div>
              </div>

              {terminalObjects.length >= 2 && (
                <>
                  <div className="absolute left-[25%] transform -translate-x-1/2 bg-black/50 px-2 py-1 rounded text-sm font-bold"
                    style={{ top: `${(terminalObjects[0].y + 55) / 4 + 5}%`, color: terminalObjects[0].reached ? colors.terminal : '#fff' }}>
                    {terminalObjects[0].v.toFixed(0)} m/s {terminalObjects[0].reached && '(Terminal!)'}
                  </div>
                  <div className="absolute left-[75%] transform -translate-x-1/2 bg-black/50 px-2 py-1 rounded text-sm font-bold"
                    style={{ top: `${(terminalObjects[1].y + 55) / 4 + 5}%`, color: terminalObjects[1].reached ? colors.terminal : '#fff' }}>
                    {terminalObjects[1].v.toFixed(0)} m/s {terminalObjects[1].reached && '(Terminal!)'}
                  </div>
                </>
              )}

              {!showTerminalSim && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                  Click &quot;Jump&quot; to start the race
                </div>
              )}
            </div>

            <div className="bg-slate-800/80 p-4 rounded-xl max-w-lg mb-4 text-sm">
              <p style={{ color: '#e2e8f0' }}>
                <span className="text-green-400 font-bold">Spread eagle:</span> Large area, high drag, lower terminal velocity (~55 m/s)
              </p>
              <p style={{ color: '#e2e8f0' }} className="mt-1">
                <span className="text-orange-400 font-bold">Tucked:</span> Small area, low drag, higher terminal velocity (~70 m/s)
              </p>
            </div>

            <div className="flex gap-3 mb-4">
              <button onClick={startTerminalSim} disabled={showTerminalSim}
                style={{ minHeight: '44px' }}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white font-bold rounded-xl">
                {showTerminalSim ? 'Falling...' : 'Jump!'}
              </button>
              <button onClick={resetTerminalSim}
                style={{ minHeight: '44px' }}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-xl">
                Reset
              </button>
            </div>

            <button onClick={() => goToPhase('twist_review')}
              style={{ minHeight: '44px' }}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl">
              Deep Dive: Terminal Velocity
            </button>
          </div>
        );

      // ========== TWIST REVIEW PHASE ==========
      case 'twist_review':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">Understanding Terminal Velocity</h2>

            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 p-6 rounded-xl max-w-lg mb-6 border border-purple-500/30">
              <h3 className="text-lg font-bold text-pink-400 mb-4 text-center">The Balance Point</h3>

              <div className="bg-slate-900 p-4 rounded-lg text-center mb-4">
                <p className="text-slate-300 mb-2">At terminal velocity:</p>
                <span className="text-xl font-mono text-yellow-400">F<sub>drag</sub> = Weight = mg</span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-lg font-bold text-cyan-400">1</span>
                  <p className="text-slate-300">Object begins falling, gravity accelerates it downward</p>
                </div>
                <div className="flex items-start gap-3 bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-lg font-bold text-cyan-400">2</span>
                  <p className="text-slate-300">As velocity increases, drag force grows (F = ½ρv²CdA)</p>
                </div>
                <div className="flex items-start gap-3 bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-lg font-bold text-cyan-400">3</span>
                  <p className="text-slate-300">Eventually drag equals weight: net force = 0</p>
                </div>
                <div className="flex items-start gap-3 bg-slate-800/50 p-3 rounded-lg border border-yellow-500/30">
                  <span className="text-lg font-bold text-yellow-400">4</span>
                  <p className="text-slate-300">No net force = no acceleration = <span className="text-yellow-400">constant velocity!</span></p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 p-4 rounded-xl max-w-lg mb-6">
              <h4 className="font-bold text-cyan-400 mb-2">Terminal Velocity Formula</h4>
              <div className="bg-slate-900 p-3 rounded text-center mb-2">
                <span className="font-mono text-sky-400">v<sub>terminal</sub> = sqrt(2mg / ρC<sub>d</sub>A)</span>
              </div>
              <p className="text-slate-400 text-sm">
                Higher mass (m) or lower area (A) = faster terminal velocity. That&apos;s why a tucked
                skydiver falls faster than one spread-eagle!
              </p>
            </div>

            <button onClick={() => goToPhase('transfer')}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold rounded-xl">
              Real-World Applications
            </button>
          </div>
        );

      // ========== TRANSFER PHASE ==========
      case 'transfer':
        const currentApp = realWorldApps[activeAppTab];
        return (
          <div className="flex flex-col items-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-green-400 mb-2">Real-World Applications</h2>
            <p style={{ color: '#e2e8f0' }} className="mb-2">Drag force shapes technology across every industry</p>

            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-6">
              <span style={{ color: '#e2e8f0' }} className="text-sm">Progress: {completedApps.size} of {realWorldApps.length} applications explored</span>
              <div className="flex gap-1">
                {realWorldApps.map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${completedApps.has(i) ? 'bg-green-500' : 'bg-slate-600'}`} />
                ))}
              </div>
            </div>

            {/* App tabs */}
            <div className="flex gap-2 mb-6 flex-wrap justify-center">
              {realWorldApps.map((app, index) => (
                <button
                  key={index}
                  onClick={() => { setActiveAppTab(index); setExpandedApp(null); }}
                  style={{ minHeight: '44px', backgroundColor: activeAppTab === index ? app.color : undefined }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                    activeAppTab === index
                      ? 'text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <span className="mr-1">{app.icon}</span>
                  {completedApps.has(index) && <span className="mr-1">&#10003;</span>}
                  {app.short}
                </button>
              ))}
            </div>

            {/* App content card */}
            <div className="w-full max-w-2xl rounded-2xl overflow-hidden border border-slate-700/50"
              style={{ background: `linear-gradient(135deg, ${currentApp.color}22, ${currentApp.color}11)` }}>

              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-5xl">{currentApp.icon}</span>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{currentApp.title}</h3>
                    <p className="text-slate-400">{currentApp.tagline}</p>
                  </div>
                </div>

                <p style={{ color: '#e2e8f0' }} className="mb-4">{currentApp.description}</p>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {currentApp.stats.map((stat, i) => (
                    <div key={i} className="bg-slate-900/50 p-3 rounded-lg text-center">
                      <div className="text-2xl mb-1">{stat.icon}</div>
                      <div className="text-lg font-bold" style={{ color: currentApp.color }}>{stat.value}</div>
                      <div className="text-xs text-slate-400">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Expandable details */}
                <button
                  onClick={() => setExpandedApp(expandedApp === activeAppTab ? null : activeAppTab)}
                  className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  {expandedApp === activeAppTab ? 'Show Less' : 'Show More Details'}
                  <svg className={`w-4 h-4 transition-transform ${expandedApp === activeAppTab ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedApp === activeAppTab && (
                  <div className="mt-4 space-y-4 border-t border-slate-700/50 pt-4">
                    <div>
                      <h4 className="font-bold text-cyan-400 mb-2">Physics Connection</h4>
                      <p className="text-slate-300 text-sm">{currentApp.connection}</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-cyan-400 mb-2">How It Works</h4>
                      <p className="text-slate-300 text-sm">{currentApp.howItWorks}</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-cyan-400 mb-2">Real Examples</h4>
                      <ul className="text-slate-300 text-sm space-y-1">
                        {currentApp.examples.map((ex, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-400">&#8226;</span>
                            <span>{ex}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-cyan-400 mb-2">Key Companies</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentApp.companies.map((company, i) => (
                          <span key={i} className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">
                            {company}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-cyan-400 mb-2">Future Impact</h4>
                      <p className="text-slate-300 text-sm">{currentApp.futureImpact}</p>
                    </div>
                  </div>
                )}

                {/* Mark complete button */}
                {!completedApps.has(activeAppTab) && (
                  <button onClick={() => handleAppComplete(activeAppTab)}
                    style={{ minHeight: '44px' }}
                    className="w-full mt-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all">
                    Mark as Understood
                  </button>
                )}
              </div>
            </div>

            <p style={{ color: '#e2e8f0' }} className="mt-4">Explored: {completedApps.size} / {realWorldApps.length}</p>

            {completedApps.size >= 2 && (
              <button onClick={() => goToPhase('test')}
                style={{ minHeight: '44px' }}
                className="mt-4 px-8 py-3 bg-gradient-to-r from-sky-600 to-cyan-600 text-white font-bold rounded-xl">
                Take the Quiz
              </button>
            )}
          </div>
        );

      // ========== TEST PHASE ==========
      case 'test':
        const answeredCount = testAnswers.filter(a => a !== -1).length;
        return (
          <div className="flex flex-col items-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-sky-400 mb-2">Knowledge Check</h2>
            <p style={{ color: '#e2e8f0' }} className="mb-2">10 scenario-based questions to test your understanding</p>

            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-4">
              <span style={{ color: '#e2e8f0' }} className="text-sm">Question {Math.min(answeredCount + 1, 10)} of 10</span>
              <div className="flex gap-1">
                {testQuestions.map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${testAnswers[i] !== -1 ? 'bg-green-500' : i === answeredCount ? 'bg-sky-500' : 'bg-slate-600'}`} />
                ))}
              </div>
            </div>

            <div className="w-full max-w-2xl space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {testQuestions.map((q, qIndex) => (
                <div key={qIndex} className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/50">
                  <div className="bg-slate-900/50 p-3 rounded-lg mb-3">
                    <p style={{ color: '#e2e8f0' }} className="text-sm italic mb-2">{q.scenario}</p>
                    <p style={{ color: '#e2e8f0' }} className="font-medium">Q{qIndex + 1}. {q.question}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onClick={() => handleTestAnswer(qIndex, oIndex)}
                        disabled={showTestResults}
                        style={{ minHeight: '44px' }}
                        className={`p-3 rounded-lg text-sm text-left transition-all ${
                          showTestResults && option.correct
                            ? 'bg-green-600 text-white border-2 border-green-400'
                            : showTestResults && testAnswers[qIndex] === oIndex && !option.correct
                            ? 'bg-red-600 text-white border-2 border-red-400'
                            : testAnswers[qIndex] === oIndex
                            ? 'bg-sky-600 text-white border-2 border-sky-400 ring-2 ring-sky-400'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600'
                        }`}
                      >
                        <span className="font-bold mr-2">{option.id.toUpperCase()}.</span>
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {showTestResults && (
                    <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border-l-4 border-cyan-500">
                      <div className="flex items-center gap-2 mb-1">
                        {testQuestions[qIndex]?.options[testAnswers[qIndex]]?.correct ? (
                          <span className="text-green-400 font-bold">&#10003; Correct</span>
                        ) : (
                          <span className="text-red-400 font-bold">&#10007; Incorrect</span>
                        )}
                      </div>
                      <p style={{ color: '#e2e8f0' }} className="text-sm">{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!showTestResults && testAnswers.every(a => a !== -1) && (
              <button onClick={handleSubmitTest}
                style={{ minHeight: '44px' }}
                className="mt-6 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl">
                Submit Answers
              </button>
            )}

            {showTestResults && (
              <div className="mt-6 text-center">
                <p className="text-3xl font-bold text-sky-400">Score: {testScore} / 10</p>
                <p className={`text-lg mt-2 ${testScore >= 7 ? 'text-green-400' : 'text-orange-400'}`}>
                  {testScore >= 7 ? 'Excellent! You\'ve mastered drag force!' : 'Good effort! Review and try again.'}
                </p>

                {/* Answer review summary */}
                <div className="mt-4 flex justify-center gap-1 flex-wrap max-w-md mx-auto">
                  {testQuestions.map((_, i) => {
                    const isCorrect = testQuestions[i]?.options[testAnswers[i]]?.correct;
                    return (
                      <div key={i} className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${isCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                        {isCorrect ? '✓' : '✗'}
                      </div>
                    );
                  })}
                </div>

                {testScore >= 7 && (
                  <button onClick={() => goToPhase('mastery')}
                    style={{ minHeight: '44px' }}
                    className="mt-4 px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl">
                    Claim Your Badge
                  </button>
                )}
              </div>
            )}
          </div>
        );

      // ========== MASTERY PHASE ==========
      case 'mastery':
        return (
          <div className="flex flex-col items-center justify-center min-h-[600px] p-6 text-center">
            <div className="text-8xl mb-6 animate-bounce">&#127942;</div>

            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
              Drag Force Master!
            </h2>

            <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 p-8 rounded-2xl max-w-lg mb-8">
              <p className="text-xl text-slate-200 mb-6">
                You&apos;ve conquered the physics of air resistance!
              </p>

              <div className="text-left space-y-3 text-slate-300">
                <div className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">&#10003;</span>
                  <span>The drag equation: F = ½ρv²CdA</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">&#10003;</span>
                  <span>Velocity squared relationship - why speed is so costly</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">&#10003;</span>
                  <span>Terminal velocity - when drag balances weight</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">&#10003;</span>
                  <span>Real applications: F1, parachutes, cycling, aviation</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-xl max-w-lg mb-6">
              <p className="text-cyan-400 font-medium">
                From supersonic jets to falling raindrops, you now understand the invisible force
                that shapes how everything moves through air!
              </p>
            </div>

            <button onClick={() => goToPhase('hook')}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all">
              Explore Again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />

      {/* Progress bar - Fixed navigation with proper z-index */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }} className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-sky-400">Drag Force</span>
          <div className="flex gap-1.5">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ minHeight: '44px', minWidth: '44px' }}
                className={`h-2 rounded-full transition-all duration-300 flex items-center justify-center ${
                  phase === p
                    ? 'bg-gradient-to-r from-sky-400 to-cyan-400 w-6 shadow-lg shadow-sky-500/50'
                    : phaseOrder.indexOf(phase) > i
                    ? 'bg-emerald-500 w-2'
                    : 'bg-slate-600 w-2 hover:bg-slate-500'
                }`}
                title={phaseLabels[p]}
                aria-label={`Go to ${phaseLabels[p]} phase`}
              />
            ))}
          </div>
          <span style={{ color: '#e2e8f0' }} className="text-sm font-medium">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 pt-16 pb-8">
        {renderPhaseContent()}
      </div>
    </div>
  );
};

export default DragForceRenderer;
