'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// CENTER OF MASS - Complete 10-Phase Interactive Learning Game
// Understanding how mass distribution determines balance and stability
// ============================================================================

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

interface CenterOfMassRendererProps {
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

// ============================================================================
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ============================================================================
const testQuestions = [
  {
    scenario: "A physics teacher demonstrates a fork balanced on a toothpick resting on the rim of a glass. Most of the fork hangs off the edge, yet it doesn't fall.",
    question: "Why does the fork-toothpick system remain balanced despite most of the fork extending beyond the glass rim?",
    options: [
      { id: 'a', label: "The toothpick creates friction that prevents sliding" },
      { id: 'b', label: "The system's center of mass lies directly below the pivot point on the glass rim", correct: true },
      { id: 'c', label: "The fork is lighter than it appears due to hollow construction" },
      { id: 'd', label: "Air pressure pushing upward counteracts the fork's weight" }
    ],
    explanation: "The heavy fork tines pull the center of mass down and inward. When the combined center of mass of the fork-toothpick system lies below and inside the support point (glass rim), gravity creates a restoring torque that keeps it balanced. This is stable equilibrium - any tilt brings it back to center."
  },
  {
    scenario: "A high jumper approaches the bar using the Fosbury Flop technique. At the peak of her jump, her back is arched dramatically as she clears a 2-meter bar.",
    question: "How does the Fosbury Flop allow an athlete to clear a higher bar than traditional techniques?",
    options: [
      { id: 'a', label: "The curved position stores elastic energy in the spine" },
      { id: 'b', label: "Arching the back allows the center of mass to pass UNDER the bar while the body goes over", correct: true },
      { id: 'c', label: "The technique generates more lift from air resistance" },
      { id: 'd', label: "Jumping backward reduces the gravitational pull on the athlete" }
    ],
    explanation: "By arching into a U-shape, the athlete's center of mass actually travels below the bar even though every body part clears it. The COM is the average position of all mass - with the body curved, that average sits in empty space. This means the jumper's COM travels a lower trajectory than the bar height."
  },
  {
    scenario: "A tightrope walker carries a long pole that curves downward at both ends while crossing a wire 50 meters above the ground.",
    question: "Why does the curved pole help the tightrope walker maintain balance?",
    options: [
      { id: 'a', label: "The pole's weight makes the walker's feet grip the wire better" },
      { id: 'b', label: "The downward curve lowers the combined center of mass below the wire, creating stability", correct: true },
      { id: 'c', label: "Air flowing over the curved pole generates lift" },
      { id: 'd', label: "The pole absorbs vibrations from the wire" }
    ],
    explanation: "The heavy pole ends drooping below the wire pull the walker's overall center of mass downward - potentially below the wire itself. This transforms an unstable equilibrium (COM above support) into a stable one (COM below support), just like a pendulum always returns to hanging straight down."
  },
  {
    scenario: "An SUV and a sports car both take the same highway curve at 60 mph. The SUV's wheels lift off the inside, while the sports car stays firmly planted.",
    question: "Why is the SUV more likely to roll over than the sports car in this situation?",
    options: [
      { id: 'a', label: "SUVs have less tire grip due to their weight" },
      { id: 'b', label: "The SUV's higher center of mass creates a larger tipping torque relative to its wheel base", correct: true },
      { id: 'c', label: "Sports cars have more aerodynamic downforce at all speeds" },
      { id: 'd', label: "SUV suspensions are designed to be softer for comfort" }
    ],
    explanation: "When cornering, centrifugal effects push outward. A higher center of mass means this force acts through a point farther from the ground, creating a longer lever arm for the tipping torque. The taller the vehicle relative to its width, the easier it is for this torque to overcome the stabilizing effect of the wheels."
  },
  {
    scenario: "A gymnast performs a triple somersault. She starts with arms extended, tucks into a tight ball during the rotations, then extends again before landing.",
    question: "Why does tucking into a ball make the gymnast spin faster?",
    options: [
      { id: 'a', label: "Tucking reduces air resistance, allowing faster rotation" },
      { id: 'b', label: "Bringing mass closer to the rotation axis conserves angular momentum by increasing spin rate", correct: true },
      { id: 'c', label: "The gymnast's muscles generate more rotational force when contracted" },
      { id: 'd', label: "Gravity accelerates compact objects faster than extended ones" }
    ],
    explanation: "Angular momentum is conserved in the air. When the gymnast tucks, mass moves closer to the rotation axis, reducing the moment of inertia. Since angular momentum = moment of inertia x angular velocity, and momentum is fixed, angular velocity must increase. This is why ice skaters spin faster when they pull in their arms."
  },
  {
    scenario: "A loaded cargo ship sits low in the water with containers stacked three high on deck. Port officials are concerned about the ship's stability during the upcoming storm.",
    question: "Why might stacking containers too high compromise the ship's stability?",
    options: [
      { id: 'a', label: "Tall stacks catch more wind, pushing the ship sideways" },
      { id: 'b', label: "Adding weight high raises the center of mass, reducing the metacentric height and stability", correct: true },
      { id: 'c', label: "The containers obstruct the captain's view of approaching waves" },
      { id: 'd', label: "Tall stacks require the ship to travel more slowly" }
    ],
    explanation: "Ships balance around their center of buoyancy and center of gravity. When cargo raises the center of mass, the 'metacentric height' (distance between these points) decreases. A smaller metacentric height means less restoring force when the ship tilts - exactly like our fork experiment when weight shifts above the pivot."
  },
  {
    scenario: "An astronaut aboard the ISS pushes off from one wall to float across the module. She naturally curls into a slight tumble during the crossing.",
    question: "Why does the astronaut rotate around a specific point rather than randomly tumbling?",
    options: [
      { id: 'a', label: "Air currents in the module cause consistent rotation" },
      { id: 'b', label: "All rotation occurs around the center of mass, and the COM travels in a straight line", correct: true },
      { id: 'c', label: "The space station's artificial gravity creates a rotation axis" },
      { id: 'd', label: "Magnetic fields from station equipment orient the astronaut" }
    ],
    explanation: "In free fall, all rotation happens around the center of mass. If the push was off-center from her COM, it imparts both linear motion (COM travels straight) and rotation (body spins around COM). This is why divers, gymnasts, and astronauts must understand their COM to control their motion."
  },
  {
    scenario: "Engineers at Taipei 101 install a 730-ton steel pendulum near the top of the skyscraper. During typhoons, this mass swings opposite to the building's sway.",
    question: "How does this tuned mass damper stabilize the building during high winds?",
    options: [
      { id: 'a', label: "The pendulum's weight anchors the building more firmly to its foundation" },
      { id: 'b', label: "When the building sways right, the pendulum swings left, shifting the combined center of mass to counteract the motion", correct: true },
      { id: 'c', label: "The swinging pendulum generates electricity to power stabilization systems" },
      { id: 'd', label: "Friction from the pendulum converts wind energy into heat" }
    ],
    explanation: "The massive pendulum has inertia - it resists the building's motion. When wind pushes the building right, the pendulum lags behind (effectively swinging left relative to the building). This shifts the overall center of mass in the opposite direction of the sway, creating a counterforce that reduces building movement by up to 40%."
  },
  {
    scenario: "A diver stands at the end of a diving board, then takes three steps backward before running forward to jump. The board oscillates differently with each step.",
    question: "Why does the diver step backward before diving?",
    options: [
      { id: 'a', label: "Moving backward stores elastic energy in the diving board" },
      { id: 'b', label: "Stepping back allows the diver to position their center of mass for optimal approach and maximum spring force", correct: true },
      { id: 'c', label: "The backward motion reduces the diver's heart rate before the jump" },
      { id: 'd', label: "Competition rules require a minimum approach distance" }
    ],
    explanation: "The approach lets the diver time their jump to match the board's natural oscillation. By controlling their center of mass position throughout the approach, they maximize energy transfer from the board. The final step positions the COM to drive the board down at its maximum flex point, launching them higher."
  },
  {
    scenario: "A hammer thrower spins rapidly, leaning back dramatically as the heavy ball extends outward on its wire. Just before release, the thrower is nearly horizontal.",
    question: "Why must the thrower lean so far back during the spin?",
    options: [
      { id: 'a', label: "Leaning back builds up more muscle tension for the throw" },
      { id: 'b', label: "The athlete positions their body so the combined center of mass of athlete plus hammer stays over their feet", correct: true },
      { id: 'c', label: "Horizontal position reduces wind resistance during the spin" },
      { id: 'd', label: "The lean allows the athlete to see the throwing sector better" }
    ],
    explanation: "The hammer and thrower form one rotating system. As the heavy ball swings outward at high speed, it pulls the system's center of mass away from the athlete. By leaning opposite to the hammer, the thrower keeps the combined COM over their feet - the base of support. This is the same principle as our fork balanced on a glass."
  }
];

// ============================================================================
// REAL WORLD APPLICATIONS - 4 detailed applications
// ============================================================================
const realWorldApps = [
  {
    icon: '🚗',
    title: 'Vehicle Rollover Prevention',
    short: 'Keeping vehicles grounded through physics',
    tagline: 'When centrifugal force meets center of mass',
    description: 'Modern vehicles use electronic stability control (ESC) systems that monitor the vehicle center of mass position relative to its wheelbase. ESC reduces rollover accidents by 35% and processes data from gyroscopic sensors over 100 times per second with a response time of 50ms. When sensors detect dangerous COM shifts during sharp turns or sudden maneuvers, the system automatically applies selective braking to individual wheels and reduces engine power to prevent rollover. SUVs with a COM height above 0.7m are 3x more likely to roll over than sedans at 0.5m.',
    connection: 'Just like our fork experiment, vehicle stability depends on keeping the center of mass low and within the base of support. When cornering forces push the COM beyond the tire contact patches, the vehicle tips - exactly like adding weight to the wrong side of the toothpick.',
    howItWorks: 'Gyroscopic sensors measure roll rate and lateral acceleration 100+ times per second. An onboard computer compares these against a model of the vehicles COM position, factoring in cargo and passengers. When rollover risk exceeds thresholds, hydraulic brakes pulse individual wheels while throttle cuts power.',
    stats: [
      { value: '35%', label: 'Rollover reduction', icon: '📉' },
      { value: '100+', label: 'Readings/second', icon: '📊' },
      { value: '50ms', label: 'Response time', icon: '⚡' }
    ],
    examples: ['Electronic Stability Control in passenger cars', 'Active Roll Stabilization in SUVs', 'Cargo load monitoring in trucks', 'Anti-rollover in military vehicles'],
    companies: ['Bosch', 'Continental', 'Toyota', 'Volvo'],
    futureImpact: 'Next-generation vehicles will feature predictive rollover prevention using AI that analyzes road conditions and driving patterns to anticipate dangerous situations before they occur.',
    color: '#EF4444'
  },
  {
    icon: '🤸',
    title: 'Gymnastics & Diving',
    short: 'Athletic mastery through body physics',
    tagline: 'Controlling rotation by redistributing mass',
    description: 'Elite gymnasts and divers are intuitive physicists who manipulate their body center of mass with remarkable precision. During aerial maneuvers, athletes tuck, pike, and twist by repositioning limbs to shift their COM and control rotation speed. Coaches use motion capture and physics simulations to optimize technique.',
    connection: 'When a diver tucks, they bring mass closer to the rotation axis - like positioning weight near the pivot point. Extending arms and legs moves mass outward, slowing rotation for a controlled landing. This is angular momentum conservation in action.',
    howItWorks: 'In the air, angular momentum is fixed. Athletes change rotation speed by changing moment of inertia - mass distribution around the spin axis. Tucking reduces moment of inertia, so angular velocity must increase. Extending has the opposite effect. Elite athletes shift their COM by centimeters with split-second timing.',
    stats: [
      { value: '4x', label: 'Spin speedup', icon: '🔄' },
      { value: '0.3s', label: 'Tuck time', icon: '⏱️' },
      { value: '10m', label: 'Platform height', icon: '📏' }
    ],
    examples: ['Triple somersaults in diving', 'Quadruple twists in figure skating', 'Fosbury Flop high jump', 'Aerial skiing rotations'],
    companies: ['USA Gymnastics', 'FINA World Aquatics', 'Red Bull Athletes', 'Olympic Training Centers'],
    futureImpact: 'Wearable sensors will provide real-time COM feedback during training, allowing athletes to perfect technique. VR systems will let athletes practice dangerous moves virtually first.',
    color: '#10B981'
  },
  {
    icon: '🚢',
    title: 'Ship Stability Engineering',
    short: 'Keeping vessels upright in rough seas',
    tagline: 'Ballast, metacentric height, and the physics of floating',
    description: 'Naval architects must carefully calculate center of gravity position relative to center of buoyancy. Ships carry heavy ballast low in the hull to keep the COM below the center of buoyancy. This creates stability - when the ship tilts, buoyancy creates a restoring moment that rights the vessel.',
    connection: 'A ship with cargo loaded high is like our fork with weight added above the pivot - unstable and prone to capsizing. Ballast acts like the fork tines, pulling the COM low. The metacentric height measures how far COM is below the point where stability reverses.',
    howItWorks: 'When a ship tilts, the underwater shape changes, shifting the center of buoyancy. If this shift creates a restoring moment (turning the ship upright), the vessel is stable. The greater the metacentric height, the stronger the restoring force. Loading cargo high reduces metacentric height dangerously.',
    stats: [
      { value: '0.5-2m', label: 'Metacentric height', icon: '📐' },
      { value: '1000+t', label: 'Ballast weight', icon: '⚓' },
      { value: '30deg', label: 'Max heel angle', icon: '📊' }
    ],
    examples: ['Container ship stability', 'Aircraft carrier ballast systems', 'Sailing yacht keels', 'Offshore platform design'],
    companies: ['Maersk', 'Naval architects worldwide', 'Classification societies', 'Maritime safety boards'],
    futureImpact: 'Autonomous ships will use real-time stability monitoring with AI-driven ballast adjustment, automatically redistributing weight as cargo shifts or seas change.',
    color: '#3B82F6'
  },
  {
    icon: '🏗️',
    title: 'Crane Load Balancing',
    short: 'Moving mountains with mathematical precision',
    tagline: 'Counterweights and moment calculations',
    description: 'Tower cranes and mobile cranes must constantly account for the shifting center of mass as they lift and move heavy loads. The combined COM of crane plus load determines stability. Modern cranes use load moment indicators that calculate real-time COM position and prevent exceeding safe lifting envelopes.',
    connection: 'A crane with a heavy load extended outward is exactly like our fork with weight on the wrong side. If the combined COM moves outside the support base (outriggers or foundation), the whole system tips. Counterweights are like adding weight to the fork side - shifting COM back to stability.',
    howItWorks: 'Load cells measure weight while angle sensors track boom position. The load moment indicator calculates load moment (weight times distance) and compares against the stabilizing moment from counterweights. When approaching tipping threshold, alarms sound and limiters prevent further extension.',
    stats: [
      { value: '20,000kg', label: 'Typical capacity', icon: '🏋️' },
      { value: '100+m', label: 'Boom reach', icon: '📏' },
      { value: '85%', label: 'Safety margin', icon: '🛡️' }
    ],
    examples: ['Skyscraper tower cranes', 'Mobile cranes for bridges', 'Container port cranes', 'Offshore heavy-lift vessels'],
    companies: ['Liebherr', 'Manitowoc', 'Tadano', 'XCMG'],
    futureImpact: 'Autonomous cranes will use computer vision and AI to plan optimal lift sequences that minimize COM excursions. Digital twins will simulate every lift before execution.',
    color: '#F59E0B'
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const CenterOfMassRenderer: React.FC<CenterOfMassRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state
  const [weightPosition, setWeightPosition] = useState(0); // -1 (fork side) to +1 (other side)
  const [showCOM, setShowCOM] = useState(true);
  const [pivotHeight, setPivotHeight] = useState(50); // % height on glass
  const [animationFrame, setAnimationFrame] = useState(0);
  const [experimentCount, setExperimentCount] = useState(0);

  // Twist phase - adjustable weight
  const [twistWeight, setTwistWeight] = useState(50); // grams
  const [twistPosition, setTwistPosition] = useState(-0.5); // -1 to +1

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

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Calculate stability based on weight position
  const calculateStability = useCallback((pos: number, weight: number = 50) => {
    // Base COM is below pivot (stable) at -0.3
    const baseCOM = -0.3;
    // Weight shifts COM toward its position, scaled by weight
    const weightEffect = pos * (weight / 100) * 0.5;
    const finalCOM = baseCOM + weightEffect;
    // Stable if COM is below pivot (negative value)
    return {
      comPosition: finalCOM,
      stable: finalCOM < 0.1,
      tiltAngle: Math.max(-45, Math.min(45, finalCOM * 60))
    };
  }, []);

  const stability = calculateStability(weightPosition);
  const twistStability = calculateStability(twistPosition, twistWeight);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#10B981', // Emerald green
    accentGlow: 'rgba(16, 185, 129, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
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

  // Confirm flow for quiz
  const [confirmedIndex, setConfirmedIndex] = useState(-1);

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseNames: Record<string, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Weight Experiment',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };
  const phaseLabels = phaseNames as Record<Phase, string>;

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'center-of-mass',
        gameTitle: 'Center of Mass',
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

  // Fork Balance Visualization
  const ForkVisualization = ({ showWeight = false, weightPos = 0, tiltAngle = 0, pivotPct = 50 }: { showWeight?: boolean; weightPos?: number; tiltAngle?: number; pivotPct?: number }) => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 340;
    const cx = width / 2;
    // pivotPct shifts the pivot point vertically (20=high, 80=low)
    const pivotY = height * (0.3 + (pivotPct / 100) * 0.3);

    // Calculate COM position
    const comX = cx + (showWeight ? weightPos * 60 : -40);
    const comY = pivotY + (showWeight ? 20 + weightPos * 30 : 30);

    // Animation offset for subtle motion
    const wobble = Math.sin(animationFrame * 0.1) * (stability.stable ? 1 : 3);

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="forkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9CA3AF" />
            <stop offset="50%" stopColor="#D1D5DB" />
            <stop offset="100%" stopColor="#9CA3AF" />
          </linearGradient>
          <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.5)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.3)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Glass */}
        <path
          d={`M ${cx - 40} ${height - 40} L ${cx - 50} ${pivotY + 20} L ${cx + 50} ${pivotY + 20} L ${cx + 40} ${height - 40} Z`}
          fill="url(#glassGrad)"
          stroke="#3B82F6"
          strokeWidth="2"
        />
        <ellipse cx={cx} cy={pivotY + 20} rx="50" ry="8" fill="none" stroke="#3B82F6" strokeWidth="2" />

        {/* Pivot point on glass rim */}
        <circle cx={cx + 30} cy={pivotY} r="6" fill={colors.success} filter="url(#glow)" />
        <text x={cx + 30} y={pivotY - 15} textAnchor="middle" fill={colors.success} fontSize="10" fontWeight="600">PIVOT</text>

        {/* Fork and toothpick system - rotates around pivot */}
        <g transform={`rotate(${tiltAngle + wobble} ${cx + 30} ${pivotY})`}>
          {/* Toothpick */}
          <line
            x1={cx - 80}
            y1={pivotY}
            x2={cx + 80}
            y2={pivotY}
            stroke="#D4A574"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Fork handle (right side, lighter) */}
          <rect x={cx + 30} y={pivotY - 4} width="50" height="8" rx="2" fill="#9CA3AF" />

          {/* Fork head (left side, heavier) */}
          <g transform={`translate(${cx - 80} ${pivotY})`}>
            {/* Fork neck */}
            <rect x="0" y="-4" width="30" height="8" rx="2" fill="url(#forkGrad)" />
            {/* Fork tines */}
            {[-12, -4, 4, 12].map((offset, i) => (
              <rect key={i} x="-35" y={offset - 2} width="35" height="4" rx="2" fill="url(#forkGrad)" />
            ))}
          </g>

          {/* Added weight (clay) */}
          {showWeight && (
            <g>
              <circle
                cx={cx + 30 + weightPos * 50}
                cy={pivotY - 15}
                r="12"
                fill="#8B5CF6"
                stroke="#7C3AED"
                strokeWidth="2"
              />
              <text x={cx + 30 + weightPos * 50} y={pivotY - 12} textAnchor="middle" fill="white" fontSize="8" fontWeight="600">
                CLAY
              </text>
            </g>
          )}

          {/* Center of Mass indicator */}
          {showCOM && (
            <g>
              <circle cx={comX} cy={comY} r="10" fill={colors.error} filter="url(#glow)" />
              <text x={comX} y={comY + 25} textAnchor="middle" fill={colors.error} fontSize="10" fontWeight="600">COM</text>
            </g>
          )}
        </g>

        {/* Labels */}
        <text x={cx - 60} y={height - 15} textAnchor="middle" fill={colors.textMuted} fontSize="11">Heavy side</text>
        <text x={cx + 60} y={height - 15} textAnchor="middle" fill={colors.textMuted} fontSize="11">Light side</text>

        {/* Status */}
        <rect x={cx - 50} y="15" width="100" height="28" rx="6" fill={stability.stable ? colors.success + '33' : colors.error + '33'} />
        <text x={cx} y="34" textAnchor="middle" fill={stability.stable ? colors.success : colors.error} fontSize="14" fontWeight="700">
          {stability.stable ? 'STABLE' : 'UNSTABLE'}
        </text>
      </svg>
    );
  };

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Bottom navigation bar
  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;
    const isTestPhase = phase === 'test';
    const quizComplete = isTestPhase && testSubmitted;
    const canGoNext = !isLast && (!isTestPhase || quizComplete);
    return (
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
        <button onClick={() => !isFirst && goToPhase(phaseOrder[currentIndex - 1])} style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: isFirst ? 'rgba(255,255,255,0.3)' : 'white', cursor: isFirst ? 'not-allowed' : 'pointer', opacity: isFirst ? 0.4 : 1 }}>
          Back
        </button>
        <div style={{ display: 'flex', gap: '6px' }}>
          {phaseOrder.map((p, i) => (
            <div key={p} onClick={() => i <= currentIndex && goToPhase(p)} title={phaseNames[p] || p} style={{ width: p === phase ? '20px' : '10px', height: '10px', borderRadius: '5px', background: p === phase ? '#3b82f6' : i < currentIndex ? '#10b981' : 'rgba(255,255,255,0.2)', cursor: i <= currentIndex ? 'pointer' : 'default', transition: 'all 0.3s ease' }} />
          ))}
        </div>
        <button onClick={() => canGoNext && goToPhase(phaseOrder[currentIndex + 1])} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: canGoNext ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)', color: 'white', cursor: canGoNext ? 'pointer' : 'not-allowed', opacity: canGoNext ? 1 : 0.4 }}>
          Next
        </button>
      </div>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #059669)`,
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

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

  // Wrap all phase content with bottom bar
  const renderPhaseContent = (): React.ReactNode => {

  // HOOK PHASE
  if (phase === 'hook') {
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
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'float 3s ease-in-out infinite',
        }}>
          <span role="img" aria-label="balance">
            <span style={{ display: 'inline-block', transform: 'rotate(-15deg)' }}>&#129348;</span>
            <span>&#129351;</span>
          </span>
        </div>
        <style>{`@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          The Impossible Balance
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "A fork hangs off the edge of a glass and <span style={{ color: colors.accent }}>doesn't fall</span>. Most of its weight extends into thin air. How is this possible?"
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <ForkVisualization />
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '16px', fontStyle: 'italic' }}>
            This party trick reveals a profound physics principle that engineers use to design everything from skyscrapers to spacecraft.
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover the Secret
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The toothpick creates friction that prevents the fork from sliding off' },
      { id: 'b', text: 'The center of mass lies below the support point, creating stable equilibrium', correct: true },
      { id: 'c', text: 'The fork is hollow and lighter than it appears' },
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
            Why doesn't the fork fall off the glass?
          </h2>

          {/* Diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <ForkVisualization />
            <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '16px' }}>
              The fork hangs off the edge, yet remains perfectly balanced. Why?
            </p>
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

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Balance Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Balance Explorer
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Toggle the center of mass indicator to see why the fork stays balanced.
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <ForkVisualization pivotPct={pivotHeight} />
            </div>

            {/* COM Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              marginBottom: '24px',
            }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>Hide COM</span>
              <button
                onClick={() => setShowCOM(!showCOM)}
                style={{
                  width: '60px',
                  height: '30px',
                  borderRadius: '15px',
                  border: 'none',
                  background: showCOM ? colors.error : colors.border,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.3s',
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: '3px',
                  left: showCOM ? '33px' : '3px',
                  transition: 'left 0.3s',
                }} />
              </button>
              <span style={{ ...typo.small, color: showCOM ? colors.error : colors.textSecondary, fontWeight: showCOM ? 600 : 400 }}>
                Show COM
              </span>
            </div>

            {/* Pivot height slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Pivot Height</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{pivotHeight}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="80"
                value={pivotHeight}
                onChange={(e) => setPivotHeight(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Key observation */}
            <div style={{
              background: colors.success + '22',
              border: `1px solid ${colors.success}44`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
                <strong style={{ color: colors.success }}>Key Observation:</strong> The red dot (center of mass) is <strong>below</strong> the green pivot point!
              </p>
            </div>
          </div>

          {/* Explanation cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}44`,
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>&#9989;</div>
              <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '8px' }}>Stable</h3>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                COM below pivot = Gravity pulls it back to center, like a pendulum
              </p>
            </div>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.error}44`,
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>&#10060;</div>
              <h3 style={{ ...typo.h3, color: colors.error, marginBottom: '8px' }}>Unstable</h3>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                COM above pivot = Any tilt makes it fall further, like a pencil on its tip
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'b';

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Secret: Center of Mass
          </h2>

          {/* Prediction result */}
          <div style={{
            background: wasCorrect ? colors.success + '22' : colors.warning + '22',
            border: `1px solid ${wasCorrect ? colors.success : colors.warning}44`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: wasCorrect ? colors.success : colors.warning, margin: 0 }}>
              {wasCorrect ? 'Your prediction was correct!' : 'Now you understand why!'}
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
                <strong style={{ color: colors.textPrimary }}>Center of Mass (COM)</strong> is the point where all of an object's mass can be considered concentrated.
              </p>
              <p style={{ marginBottom: '16px' }}>
                When the COM is <span style={{ color: colors.success }}>below the pivot point</span>: Gravity creates a <strong>restoring torque</strong>. Any tilt is corrected - the system returns to balance like a pendulum.
              </p>
              <p>
                When the COM is <span style={{ color: colors.error }}>above the pivot point</span>: Gravity creates a <strong>destabilizing torque</strong>. Any tilt causes it to fall further - like balancing a pencil on your finger.
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Why the Fork Trick Works
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              The heavy fork tines pull the combined center of mass of the fork-toothpick system <strong>down and inward</strong>. Even though most of the fork hangs off the glass, the COM lies below the rim - creating stable equilibrium.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Can We Break the Balance?
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Near the fork (heavy side) - makes it more stable by lowering COM further' },
      { id: 'b', text: 'In the middle - has no effect on balance' },
      { id: 'c', text: 'Away from the fork - raises COM and causes it to fall', correct: true },
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
              New Variable: Adding Weight
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Where should you add clay to make the fork fall?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <ForkVisualization showWeight={true} weightPos={0} />
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
              Test With Experiment
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Weight Position Experiment
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Slide the weight along the toothpick to see how it affects stability
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <ForkVisualization
                showWeight={true}
                weightPos={twistPosition}
                tiltAngle={twistStability.tiltAngle}
              />
            </div>

            {/* Position slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Clay Position</span>
                <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>
                  {twistPosition < -0.3 ? 'Fork side' : twistPosition > 0.3 ? 'Handle side' : 'Center'}
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={twistPosition * 100}
                onChange={(e) => {
                  setTwistPosition(parseInt(e.target.value) / 100);
                  if (experimentCount === 0 || Math.abs(parseInt(e.target.value) / 100 - twistPosition) > 0.3) {
                    setExperimentCount(c => c + 1);
                  }
                }}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.success }}>Fork side (Stable)</span>
                <span style={{ ...typo.small, color: colors.error }}>Handle side (Unstable)</span>
              </div>
            </div>

            {/* Weight slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Clay Weight</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{twistWeight}g</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={twistWeight}
                onChange={(e) => setTwistWeight(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Status */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: twistStability.stable ? colors.success : colors.error }}>
                  {twistStability.stable ? 'STABLE' : 'FALLING'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Status</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.textPrimary }}>{experimentCount}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Experiments</div>
              </div>
            </div>
          </div>

          {/* Insight */}
          {twistPosition > 0.5 && (
            <div style={{
              background: colors.error + '22',
              border: `1px solid ${colors.error}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                Adding weight to the handle side raises the COM above the pivot - making it unstable!
              </p>
            </div>
          )}

          {twistPosition < -0.5 && (
            <div style={{
              background: colors.success + '22',
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Adding weight to the fork side lowers the COM - making it even more stable!
              </p>
            </div>
          )}

          {experimentCount >= 2 && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              I See the Pattern
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
            The Universal Stability Principle
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>&#11015;&#65039;</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Lowering COM = More Stability</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Adding weight below the pivot (like the fork tines) increases the restoring force. Race cars sit low, ships carry ballast at the bottom, and tightrope walkers use drooping poles.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>&#11014;&#65039;</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Raising COM = Less Stability</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Adding weight above the pivot (like clay on the handle) creates destabilizing torque. Top-heavy SUVs roll over, loaded cargo ships capsize, and tall buildings need dampers.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>&#127919;</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>The Golden Rule</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Keep your center of mass over (or below) your base of support.</strong> This applies to everything from standing on one foot to designing spacecraft.
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
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

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
                    &#10003;
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
                Connection to Center of Mass:
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

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px', fontWeight: 600 }}>
                Examples:
              </h4>
              <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                {app.examples.slice(0, 3).map((ex, i) => (
                  <li key={i}>{ex}</li>
                ))}
              </ul>
            </div>

            <div style={{
              background: `${app.color}11`,
              borderRadius: '8px',
              padding: '12px',
            }}>
              <h4 style={{ ...typo.small, color: app.color, marginBottom: '4px', fontWeight: 600 }}>
                Future Impact:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.futureImpact}
              </p>
            </div>
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
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '&#127942;' : '&#128218;'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand center of mass and stability!'
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
                Review & Try Again
              </button>
            )}
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
        padding: '24px',
      }}>
        {renderProgressBar()}

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

          {/* Navigation with confirm flow */}
          {(() => {
            const hasAnswer = !!testAnswers[currentQuestion];
            const isConfirmed = confirmedIndex >= currentQuestion;
            const isLastQ = currentQuestion === 9;

            if (hasAnswer && !isConfirmed) {
              return (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => {
                      setConfirmedIndex(currentQuestion);
                      playSound('click');
                    }}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '10px',
                      border: 'none',
                      background: colors.accent,
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Check Answer
                  </button>
                </div>
              );
            }
            if (isConfirmed && !isLastQ) {
              return (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => {
                      setCurrentQuestion(prev => prev + 1);
                      playSound('click');
                    }}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '10px',
                      border: 'none',
                      background: colors.accent,
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Next Question
                  </button>
                </div>
              );
            }
            if (isConfirmed && isLastQ) {
              return (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => {
                      const score = testAnswers.reduce((acc, ans, i) => {
                        const correct = testQuestions[i].options.find(o => (o as any).correct)?.id;
                        return acc + (ans === correct ? 1 : 0);
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
                    }}
                  >
                    Submit Test
                  </button>
                </div>
              );
            }
            return null;
          })()}
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
          &#127942;
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Balance Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how center of mass determines stability - from party tricks to spacecraft engineering.
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
              'COM below pivot = stable equilibrium',
              'COM above pivot = unstable equilibrium',
              'Adding weight shifts the COM',
              'Base of support determines tipping point',
              'Angular momentum conservation in rotation',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>&#10003;</span>
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
  }

  return null;
  }; // end renderPhaseContent

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {renderPhaseContent()}
      </div>
      {renderBottomBar()}
    </div>
  );
};

export default CenterOfMassRenderer;
