import React, { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// GOLD STANDARD: GAME EVENT TYPE AND INTERFACE
// ═══════════════════════════════════════════════════════════════════════════
type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'simulation_stopped'
  | 'spring_compressed'
  | 'spring_released'
  | 'energy_measured'
  | 'parameter_changed'
  | 'milestone_reached'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'app_completed'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

// Phase type definition
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

// Phase order array
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

// Gold standard: Props with gamePhase and onPhaseComplete
interface Props {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// Gold standard: TestQuestion interface
interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

// Gold standard: TransferApp interface
interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string;
  stats: string[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

const realWorldApps = [
  {
    icon: '🏹',
    title: 'Archery & Crossbows',
    short: 'Stored energy weapons',
    tagline: 'Converting spring energy to kinetic energy',
    description: 'Bows and crossbows store elastic potential energy when drawn. Upon release, this energy converts to kinetic energy of the arrow, following E = ½kx² for the bow and E = ½mv² for the arrow.',
    connection: 'Drawing a bow stretches its limbs like springs, storing energy proportional to displacement squared. A compound bow with 70 lb draw weight and 30 inch draw stores about 80 joules.',
    howItWorks: 'Bow limbs are elastic beams that bend when the string is pulled. The stiffer the limbs (higher k) and greater the draw length (x), the more energy stored. Compound cams optimize energy transfer.',
    stats: [
      { value: '80 J', label: 'Compound bow energy', icon: '🏹' },
      { value: '350 fps', label: 'Arrow speed', icon: '⚡' },
      { value: '85%', label: 'Energy efficiency', icon: '📊' }
    ],
    examples: ['Recurve bows', 'Compound bows', 'Crossbows', 'Slingshots'],
    companies: ['Hoyt', 'Mathews', 'PSE', 'TenPoint'],
    futureImpact: 'Advanced carbon fiber and synthetic materials are pushing bow efficiency limits while reducing weight and improving consistency.',
    color: '#F59E0B'
  },
  {
    icon: '⌚',
    title: 'Mechanical Watches',
    short: 'Timekeeping through springs',
    tagline: 'Mainsprings power precision',
    description: 'Mechanical watches store energy in wound mainsprings, releasing it gradually through the escapement. The balance spring oscillates at a precise frequency, keeping accurate time.',
    connection: 'The mainspring stores elastic potential energy when wound (E = ½kx²). This energy is metered out to the escapement, which drives the balance wheel at its natural frequency.',
    howItWorks: 'Winding coils the mainspring, storing energy. The gear train transfers energy to the escapement. The balance spring (hairspring) provides restoring force for the oscillating balance wheel.',
    stats: [
      { value: '48-72 hr', label: 'Power reserve', icon: '⏰' },
      { value: '28,800 vph', label: 'Beat rate', icon: '💓' },
      { value: '+/-2 s/day', label: 'Chronometer accuracy', icon: '🎯' }
    ],
    examples: ['Rolex movements', 'Omega Co-Axial', 'Seiko Spring Drive', 'Swiss automatics'],
    companies: ['Rolex', 'Omega', 'Patek Philippe', 'Seiko'],
    futureImpact: 'Silicon escapements and new spring materials are pushing mechanical accuracy to levels previously only achievable with quartz movements.',
    color: '#3B82F6'
  },
  {
    icon: '🚀',
    title: 'Spacecraft Deployment Systems',
    short: 'Spring-powered deployments',
    tagline: 'Zero-power solar panel release',
    description: 'Satellites use spring mechanisms to deploy solar panels, antennas, and booms once in orbit. These systems store elastic energy during launch and release it reliably in the vacuum of space.',
    connection: 'Deployment springs are preloaded on Earth, storing E = ½kx². In orbit, when restraints are released (by pyrotechnic bolts or shape memory alloys), springs push panels to their deployed position.',
    howItWorks: 'Constant-force springs or torsion springs provide deployment force. Dampers prevent damage from sudden release. Latches lock panels in final position. No motors or power required.',
    stats: [
      { value: '100%', label: 'Reliability required', icon: '✅' },
      { value: '0 W', label: 'Power needed', icon: '⚡' },
      { value: '-269°C', label: 'Operating temp range', icon: '❄️' }
    ],
    examples: ['Solar panel deployment', 'Antenna unfurling', 'Boom extension', 'CubeSat separation'],
    companies: ['Northrop Grumman', 'Lockheed Martin', 'Airbus', 'NASA'],
    futureImpact: 'Shape memory alloy springs and inflatable structures are enabling more compact stowage and more reliable deployments for ever-larger space structures.',
    color: '#8B5CF6'
  },
  {
    icon: '🏃',
    title: 'Running Shoe Energy Return',
    short: 'Athletic performance',
    tagline: 'Storing and returning stride energy',
    description: 'Modern running shoes use foam midsoles and carbon plates that store elastic energy during foot strike and return it during toe-off, improving running economy by up to 4%.',
    connection: 'When you land, the shoe compresses, storing E = ½kx² in the foam. As you push off, this energy is returned. Higher energy return means less metabolic energy needed per stride.',
    howItWorks: 'Specialized foams (TPU, PEBA) compress under load and spring back quickly. Carbon fiber plates store bending energy and enhance forefoot leverage. Together they create a "super shoe" effect.',
    stats: [
      { value: '85%+', label: 'Energy return', icon: '⚡' },
      { value: '4%', label: 'Efficiency improvement', icon: '📈' },
      { value: '40+ min', label: 'Marathon records', icon: '🏆' }
    ],
    examples: ['Nike Vaporfly', 'Adidas Adizero', 'Asics Metaspeed', 'New Balance FuelCell'],
    companies: ['Nike', 'Adidas', 'Asics', 'New Balance'],
    futureImpact: 'Personalized midsole tuning based on individual biomechanics and running style could optimize energy return for each athlete.',
    color: '#10B981'
  }
];

const ElasticPotentialEnergyRenderer: React.FC<Props> = ({ onGameEvent, gamePhase = 'hook', onPhaseComplete }) => {
  // Gold standard: String phase system with invalid phase handling
  const getValidPhase = (p: string | undefined): Phase => {
    if (p && phaseOrder.includes(p as Phase)) {
      return p as Phase;
    }
    return 'hook';
  };
  const [phase, setPhase] = useState<Phase>(getValidPhase(gamePhase));
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppIndex, setActiveAppIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Simulation state
  const [springConstant, setSpringConstant] = useState(100); // N/m
  const [displacement, setDisplacement] = useState(0.1); // meters
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const [showEnergyBars, setShowEnergyBars] = useState(true);
  const [releaseMode, setReleaseMode] = useState(false);

  const animationRef = useRef<number | null>(null);

  // Responsive design
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

  // Gold standard: Web Audio API sound utility
  const playSound = useCallback((type: 'click' | 'correct' | 'incorrect' | 'complete' | 'spring') => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
        click: { freq: 600, duration: 0.1, type: 'sine' },
        correct: { freq: 800, duration: 0.2, type: 'sine' },
        incorrect: { freq: 300, duration: 0.3, type: 'sawtooth' },
        complete: { freq: 1000, duration: 0.3, type: 'sine' },
        spring: { freq: 440, duration: 0.15, type: 'triangle' }
      };

      const sound = sounds[type] || sounds.click;
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch {
      // Audio not available
    }
  }, []);

  // Gold standard: Simplified phase navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('click');

    // Call onPhaseComplete for completed phase before moving
    const currentIndex = phaseOrder.indexOf(phase);
    const newIndex = phaseOrder.indexOf(newPhase);
    if (newIndex > currentIndex) {
      onPhaseComplete?.(phase);
    }

    setPhase(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase } });
  }, [playSound, onGameEvent, phase, onPhaseComplete]);

  // Calculate elastic potential energy: PE = ½kx²
  const elasticPE = 0.5 * springConstant * displacement * displacement;
  const maxPE = 0.5 * springConstant * 0.3 * 0.3; // Max at 0.3m

  // Animation for spring oscillation after release
  useEffect(() => {
    if (!isAnimating || !releaseMode) return;

    const omega = Math.sqrt(springConstant / 1); // Assuming 1 kg mass
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setAnimationTime(t => {
        const newT = t + elapsed;
        // Damped oscillation
        const damping = Math.exp(-0.5 * newT);

        if (damping < 0.05) {
          setIsAnimating(false);
          setReleaseMode(false);
          return 0;
        }

        return newT;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, releaseMode, springConstant, displacement]);

  // Current displacement during animation
  const currentDisp = releaseMode && isAnimating
    ? displacement * Math.exp(-0.5 * animationTime) * Math.cos(Math.sqrt(springConstant) * animationTime)
    : displacement;

  // Event handlers
  const handlePrediction = useCallback((prediction: string) => {
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'C' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'C' } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'B' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'B' } });
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    playSound('click');
    onGameEvent?.({ type: 'test_answered', data: { questionIndex, answerIndex } });
  }, [playSound, onGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'app_completed', data: { appIndex } });
  }, [playSound, onGameEvent]);

  const startRelease = useCallback(() => {
    setReleaseMode(true);
    setAnimationTime(0);
    setIsAnimating(true);
    playSound('spring');
    onGameEvent?.({ type: 'spring_released', data: { displacement, energy: elasticPE } });
  }, [displacement, elasticPE, playSound, onGameEvent]);

  // Test questions with scenarios and explanations
  const testQuestions: TestQuestion[] = [
    {
      scenario: "You compress a spring by 5 cm and it stores 2 Joules of energy.",
      question: "If you compress the same spring by 10 cm (double the displacement), how much energy will it store?",
      options: [
        { text: "2 Joules (same as before)", correct: false },
        { text: "4 Joules (double)", correct: false },
        { text: "8 Joules (quadruple)", correct: true },
        { text: "16 Joules", correct: false }
      ],
      explanation: "Elastic PE = ½kx². Since energy depends on x², doubling the displacement quadruples the energy: (2)² = 4 times more. So 2J × 4 = 8J."
    },
    {
      scenario: "A bow stores 50 Joules when drawn back 0.5 meters.",
      question: "What is the effective spring constant of the bow?",
      options: [
        { text: "100 N/m", correct: false },
        { text: "200 N/m", correct: false },
        { text: "400 N/m", correct: true },
        { text: "800 N/m", correct: false }
      ],
      explanation: "From PE = ½kx²: 50 = ½ × k × (0.5)². Solving: 50 = ½ × k × 0.25, so k = 50 / 0.125 = 400 N/m."
    },
    {
      scenario: "A car's suspension spring has k = 50,000 N/m and compresses 4 cm hitting a bump.",
      question: "How much energy does the spring absorb?",
      options: [
        { text: "4 Joules", correct: false },
        { text: "40 Joules", correct: true },
        { text: "400 Joules", correct: false },
        { text: "4000 Joules", correct: false }
      ],
      explanation: "PE = ½ × 50,000 × (0.04)² = ½ × 50,000 × 0.0016 = 40 Joules. Car springs absorb significant energy!"
    },
    {
      scenario: "A compressed spring is released and launches a ball upward.",
      question: "Where does the elastic potential energy go?",
      options: [
        { text: "It disappears", correct: false },
        { text: "It converts to kinetic energy of the ball", correct: true },
        { text: "It stays in the spring", correct: false },
        { text: "It becomes heat only", correct: false }
      ],
      explanation: "Energy is conserved! The elastic PE converts to kinetic energy (½mv²) as the ball accelerates, then to gravitational PE as it rises."
    },
    {
      scenario: "Two springs have the same k = 100 N/m. Spring A is compressed 10 cm, Spring B is compressed 20 cm.",
      question: "What is the ratio of energy stored in B to energy stored in A?",
      options: [
        { text: "1:1 (same)", correct: false },
        { text: "2:1", correct: false },
        { text: "4:1", correct: true },
        { text: "8:1", correct: false }
      ],
      explanation: "Since PE ∝ x², and B has 2× the displacement: (20/10)² = 4. Spring B stores 4 times more energy."
    },
    {
      scenario: "A pogo stick spring compresses 8 cm when a 40 kg child bounces on it.",
      question: "What is the spring constant k?",
      options: [
        { text: "500 N/m", correct: false },
        { text: "5,000 N/m", correct: true },
        { text: "50,000 N/m", correct: false },
        { text: "400 N/m", correct: false }
      ],
      explanation: "At max compression, F = kx where F = mg = 40 × 10 = 400N. So k = F/x = 400 / 0.08 = 5,000 N/m."
    },
    {
      scenario: "A spring-loaded toy gun stores 0.5 J of energy. The dart has mass 10 grams.",
      question: "What is the dart's launch speed?",
      options: [
        { text: "1 m/s", correct: false },
        { text: "5 m/s", correct: false },
        { text: "10 m/s", correct: true },
        { text: "50 m/s", correct: false }
      ],
      explanation: "All PE converts to KE: ½mv² = 0.5J. So v = √(2 × 0.5 / 0.01) = √100 = 10 m/s."
    },
    {
      scenario: "An archer draws a bow storing 80 J. The arrow (50g) leaves with 70 J of kinetic energy.",
      question: "Where did the missing 10 J go?",
      options: [
        { text: "It violated energy conservation", correct: false },
        { text: "Heat, sound, and bow limb motion", correct: true },
        { text: "It stayed in the bow", correct: false },
        { text: "Gravity took it", correct: false }
      ],
      explanation: "Energy is always conserved! The 10 J went into vibration of bow limbs, sound waves, and heat from internal friction."
    },
    {
      scenario: "A bungee cord stretches 20m when a 60 kg person reaches the lowest point of their jump.",
      question: "If we model the cord as a spring, what is its k value?",
      options: [
        { text: "3 N/m", correct: false },
        { text: "30 N/m", correct: true },
        { text: "300 N/m", correct: false },
        { text: "3000 N/m", correct: false }
      ],
      explanation: "At lowest point, spring force equals weight: kx = mg. So k = mg/x = (60 × 10) / 20 = 30 N/m. Bungee cords are soft!"
    },
    {
      scenario: "A spring is compressed and locked. It's then heated significantly.",
      question: "Does the stored elastic potential energy change?",
      options: [
        { text: "Yes, heat adds energy", correct: false },
        { text: "No, PE depends only on k and x, which don't change much", correct: true },
        { text: "Yes, all energy becomes heat", correct: false },
        { text: "The spring explodes", correct: false }
      ],
      explanation: "Elastic PE = ½kx² depends on spring constant and displacement. While k might change slightly with temperature, the stored PE is primarily mechanical, not thermal."
    }
  ];

  // Transfer applications
  const transferApps: TransferApp[] = [
    {
      icon: "🏹",
      title: "Archery & Crossbows",
      short: "Archery",
      tagline: "Ancient energy storage technology",
      description: "Bows and crossbows store elastic potential energy when drawn, converting it to arrow kinetic energy upon release. This technology powered warfare and hunting for millennia.",
      connection: "A drawn bow is essentially a bent spring. The archer does work against the bow's restoring force, storing energy as PE = ½kx². Upon release, nearly all this energy transfers to the arrow's kinetic energy.",
      howItWorks: "When you draw a bow, you're deforming the limbs (like compressing a spring). The draw weight increases with distance due to the limb's spring constant. Modern compound bows use cams to optimize the force curve for maximum energy storage with comfortable draw.",
      stats: [
        "50 Joules stored in Olympic bows when drawn",
        "80+ Joules in compound bows efficiently",
        "90 m/s arrow velocity (200 mph)",
        "85% energy transfer efficiency"
      ],
      examples: [
        "Olympic recurve bows with precise limb design",
        "Compound bows with cam systems for mechanical advantage",
        "Medieval English longbows (draw weight 70-80 lbs)",
        "Modern crossbows with 400+ fps bolt speeds"
      ],
      companies: ["Hoyt", "Mathews", "Bear Archery", "TenPoint Crossbows"],
      futureImpact: "Advanced composite materials and computer-optimized limb designs continue to improve energy storage and transfer efficiency, pushing arrow speeds and accuracy to new limits.",
      color: "from-amber-600 to-orange-600"
    },
    {
      icon: "🚗",
      title: "Vehicle Suspension",
      short: "Suspension",
      tagline: "Smooth rides through energy absorption",
      description: "Car and motorcycle suspension systems use springs to absorb bump energy, storing it temporarily as elastic potential energy before dampers dissipate it as heat.",
      connection: "When a car hits a bump, the spring compresses, storing energy as PE = ½kx². Without this energy storage, the bump force would transfer directly to passengers. The spring acts as a temporary energy buffer.",
      howItWorks: "Springs compress under load, storing bump energy. Shock absorbers (dampers) then convert this stored energy to heat, preventing continuous bouncing. The spring-damper combination provides both absorption and control.",
      stats: [
        "50000 N/m typical car spring constant",
        "100 J absorbed per bump at each corner",
        "100× per second F1 spring cycles",
        "5 ms active system adjustment time"
      ],
      examples: [
        "MacPherson strut systems in passenger cars",
        "Double wishbone for sports cars",
        "Air suspension in luxury vehicles",
        "Leaf springs in heavy trucks"
      ],
      companies: ["Bilstein", "KYB", "Monroe", "Ohlins"],
      futureImpact: "Regenerative suspension systems are being developed that capture bump energy to charge batteries, turning wasted elastic PE into useful electrical energy.",
      color: "from-blue-600 to-cyan-600"
    },
    {
      icon: "🎾",
      title: "Sports Equipment",
      short: "Sports",
      tagline: "Energy return for performance",
      description: "From tennis rackets to running shoes, sports equipment is engineered to store and return elastic potential energy efficiently, enhancing athletic performance.",
      connection: "A tennis ball compresses on impact, storing PE = ½kx². The racket strings also store energy. Maximum energy return occurs when both release their stored energy in phase, maximizing ball speed.",
      howItWorks: "Modern sports equipment uses materials with high energy return ratios. Running shoe foams, racket strings, and golf club faces are all designed to store impact energy and return it with minimal loss.",
      stats: [
        "20 J stored in tennis strings per stroke",
        "90% energy return in running shoes",
        "30 J stored in golf ball compression",
        "85% trampoline energy return"
      ],
      examples: [
        "Nike ZoomX foam with 85%+ energy return",
        "Carbon fiber tennis rackets with optimized string tension",
        "Golf balls with multi-layer cores for energy storage",
        "Pole vault poles storing 1000+ J at max bend"
      ],
      companies: ["Nike", "Wilson", "Callaway", "Head"],
      futureImpact: "Meta-materials with tunable elastic properties will allow equipment that adapts its energy storage characteristics in real-time based on playing conditions.",
      color: "from-emerald-600 to-teal-600"
    },
    {
      icon: "⚡",
      title: "Energy Storage Systems",
      short: "Energy",
      tagline: "Mechanical batteries using springs",
      description: "Springs and elastic materials can store significant energy for later use, functioning as mechanical batteries in various applications from toys to grid-scale storage.",
      connection: "A wound mainspring stores energy as PE = ½kθ² (rotational analog). This energy can be released slowly over time to power mechanisms, from watches to electric grid stabilizers.",
      howItWorks: "Mechanical energy storage uses elastic deformation to store energy without chemical reactions or electrical losses. Energy is stored by doing work to compress/twist the elastic element, then recovered when it returns to equilibrium.",
      stats: [
        "2 J stored in watch mainsprings",
        "1000000 J in industrial springs (megajoules)",
        "100 kWh flywheel-spring hybrid storage",
        "48 hours of spring motor power"
      ],
      examples: [
        "Mechanical watch mainsprings (40+ hour power reserve)",
        "Wind-up toys and music boxes",
        "Clock tower mechanisms",
        "Emergency power backup springs"
      ],
      companies: ["Rolex", "Beacon Power", "Amber Kinetics", "Skeleton Technologies"],
      futureImpact: "Combined with modern materials, spring-based energy storage could provide grid-scale mechanical batteries with 50+ year lifespans and no degradation, unlike chemical batteries.",
      color: "from-purple-600 to-pink-600"
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index]?.options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  // Spring visualization with premium SVG graphics
  const renderSpring = (width: number, height: number) => {
    const pivotX = width / 2;
    const pivotY = 40;
    const baseLength = 100;
    const compressionPixels = currentDisp * 400; // Scale displacement to pixels
    const springLength = baseLength + compressionPixels;
    const coils = 12;
    const coilHeight = springLength / coils;
    const amplitude = 25;

    // Generate spring path
    let springPath = `M ${pivotX} ${pivotY}`;
    for (let i = 0; i < coils; i++) {
      const y1 = pivotY + i * coilHeight + coilHeight / 4;
      const y2 = pivotY + i * coilHeight + coilHeight / 2;
      const y3 = pivotY + i * coilHeight + coilHeight * 3 / 4;
      const y4 = pivotY + (i + 1) * coilHeight;
      springPath += ` Q ${pivotX + amplitude} ${y1} ${pivotX} ${y2}`;
      springPath += ` Q ${pivotX - amplitude} ${y3} ${pivotX} ${y4}`;
    }

    const currentPE = 0.5 * springConstant * currentDisp * currentDisp;
    const pePercent = maxPE > 0 ? Math.min(100, (currentPE / maxPE) * 100) : 0;

    // Determine compression state for visual indicators
    const isCompressed = currentDisp > 0.02;
    const compressionIntensity = Math.min(1, currentDisp / 0.25);

    return (
    <div className="relative" style={{ width, height: height + 60 }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          {/* Premium metallic spring gradient with 6 color stops */}
          <linearGradient id="epeSpringMetal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="20%" stopColor="#34d399" />
            <stop offset="40%" stopColor="#6ee7b7" />
            <stop offset="60%" stopColor="#34d399" />
            <stop offset="80%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Energy storage gradient - represents stored potential energy */}
          <linearGradient id="epeEnergyStorage" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="25%" stopColor="#047857" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="75%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#6ee7b7" />
          </linearGradient>

          {/* Energy bar gradient with smooth color transition */}
          <linearGradient id="epeEnergyBar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="33%" stopColor="#22c55e" />
            <stop offset="66%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#86efac" />
          </linearGradient>

          {/* Mass block gradient with depth */}
          <linearGradient id="epeMassBlock" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="30%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Wall mount brushed metal */}
          <linearGradient id="epeWallMetal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="25%" stopColor="#4b5563" />
            <stop offset="50%" stopColor="#6b7280" />
            <stop offset="75%" stopColor="#4b5563" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>

          {/* Compression indicator gradient - warm colors for compression */}
          <linearGradient id="epeCompressionIndicator" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#ef4444" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.9" />
          </linearGradient>

          {/* Background gradient for depth */}
          <linearGradient id="epeLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Spring glow filter with blur + merge */}
          <filter id="epeSpringGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Energy glow filter for energy bar */}
          <filter id="epeEnergyGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Mass block shadow filter */}
          <filter id="epeMassShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Compression energy radial glow */}
          <radialGradient id="epeCompressionGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0" />
          </radialGradient>

          {/* Hatching pattern for wall */}
          <pattern id="epeWallPattern" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M0,10 L10,0" stroke="#94a3b8" strokeWidth="1" strokeOpacity="0.5" />
          </pattern>
        </defs>

        {/* Premium dark lab background */}
        <rect x="0" y="0" width={width} height={height} fill="url(#epeLabBg)" rx="12" />

        {/* Subtle grid pattern */}
        <pattern id="epeLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.3" />
        </pattern>
        <rect x="0" y="0" width={width} height={height} fill="url(#epeLabGrid)" rx="12" />

        {/* Wall mount with metallic gradient */}
        <rect x={pivotX - 40} y="15" width="80" height="25" fill="url(#epeWallMetal)" rx="4" />
        <rect x={pivotX - 40} y="15" width="80" height="25" fill="url(#epeWallPattern)" rx="4" />
        {/* Wall mount highlight */}
        <rect x={pivotX - 38} y="17" width="76" height="3" fill="#9ca3af" opacity="0.3" rx="1" />

        {/* Energy storage visualization - ambient glow around spring when compressed */}
        {isCompressed && (
          <ellipse
            cx={pivotX}
            cy={pivotY + springLength / 2}
            rx={40 + compressionIntensity * 15}
            ry={springLength / 2 + 10}
            fill="url(#epeCompressionGlow)"
            opacity={compressionIntensity * 0.8}
          />
        )}

        {/* Spring with metallic gradient and glow */}
        <path
          d={springPath}
          fill="none"
          stroke="url(#epeSpringMetal)"
          strokeWidth="6"
          strokeLinecap="round"
          filter="url(#epeSpringGlow)"
        />
        {/* Spring highlight for 3D effect */}
        <path
          d={springPath}
          fill="none"
          stroke="#a7f3d0"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.4"
        />

        {/* Mass block with gradient and shadow */}
        <rect
          x={pivotX - 30}
          y={pivotY + springLength}
          width="60"
          height="40"
          rx="6"
          fill="url(#epeMassBlock)"
          filter="url(#epeMassShadow)"
        />
        {/* Mass block highlight */}
        <rect
          x={pivotX - 28}
          y={pivotY + springLength + 2}
          width="56"
          height="8"
          rx="4"
          fill="#fcd34d"
          opacity="0.4"
        />

        {/* Compression/Extension indicators */}
        {isCompressed && (
          <>
            {/* Compression arrows */}
            <g opacity={compressionIntensity}>
              <path
                d={`M ${pivotX - 50} ${pivotY + springLength / 2 - 15} L ${pivotX - 35} ${pivotY + springLength / 2} L ${pivotX - 50} ${pivotY + springLength / 2 + 15}`}
                fill="none"
                stroke="url(#epeCompressionIndicator)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={`M ${pivotX + 50} ${pivotY + springLength / 2 - 15} L ${pivotX + 35} ${pivotY + springLength / 2} L ${pivotX + 50} ${pivotY + springLength / 2 + 15}`}
                fill="none"
                stroke="url(#epeCompressionIndicator)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </>
        )}

        {/* Displacement indicator with gradient line */}
        <line x1={pivotX + 50} y1={pivotY + baseLength} x2={pivotX + 80} y2={pivotY + baseLength} stroke="#64748b" strokeWidth="1" strokeDasharray="4" />
        <line x1={pivotX + 50} y1={pivotY + springLength + 20} x2={pivotX + 80} y2={pivotY + springLength + 20} stroke="#22c55e" strokeWidth="1" strokeDasharray="4" />
        {Math.abs(currentDisp) > 0.01 && (
          <>
            <line x1={pivotX + 65} y1={pivotY + baseLength} x2={pivotX + 65} y2={pivotY + springLength + 20} stroke="url(#epeEnergyBar)" strokeWidth="2" />
            {/* Arrow heads for displacement */}
            <path
              d={`M ${pivotX + 60} ${pivotY + baseLength + 5} L ${pivotX + 65} ${pivotY + baseLength} L ${pivotX + 70} ${pivotY + baseLength + 5}`}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
            />
            <path
              d={`M ${pivotX + 60} ${pivotY + springLength + 15} L ${pivotX + 65} ${pivotY + springLength + 20} L ${pivotX + 70} ${pivotY + springLength + 15}`}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
            />
          </>
        )}

        {/* Energy bar with premium gradient */}
        {showEnergyBars && (
          <g transform={`translate(20, ${height - 80})`}>
            {/* Energy bar container with subtle glow */}
            <rect x="0" y="0" width="100" height="60" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            {/* Energy bar background */}
            <rect x="10" y="22" width="80" height="14" rx="4" fill="#0f172a" />
            {/* Energy bar fill with gradient */}
            <rect
              x="10"
              y="22"
              width={80 * pePercent / 100}
              height="14"
              rx="4"
              fill="url(#epeEnergyBar)"
              filter={pePercent > 50 ? "url(#epeEnergyGlow)" : undefined}
            />
            {/* Energy bar highlight */}
            <rect
              x="10"
              y="22"
              width={80 * pePercent / 100}
              height="4"
              rx="2"
              fill="#86efac"
              opacity="0.3"
            />
            {/* Energy storage particles when high energy */}
            {pePercent > 60 && (
              <>
                <circle cx={15 + Math.random() * 70} cy={29} r="2" fill="#6ee7b7" opacity="0.6">
                  <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1s" repeatCount="indefinite" />
                </circle>
                <circle cx={15 + Math.random() * 70} cy={29} r="1.5" fill="#a7f3d0" opacity="0.5">
                  <animate attributeName="opacity" values="0.5;0.1;0.5" dur="0.8s" repeatCount="indefinite" />
                </circle>
              </>
            )}
          </g>
        )}

        {/* SVG Text Labels for educational clarity */}
        <text x={pivotX} y={pivotY + springLength + 25} textAnchor="middle" fill="#78350f" fontSize="12" fontWeight="bold">1 kg</text>
        <text x={pivotX + 55} y={pivotY + springLength / 2} fill="#e2e8f0" fontSize="11">Spring</text>
        <text x={pivotX} y={pivotY + springLength + 55} textAnchor="middle" fill="#e2e8f0" fontSize="11">Mass Block</text>
        <text x={width - 15} y="25" textAnchor="end" fill="#e2e8f0" fontSize="11">k = {springConstant} N/m</text>
        {showEnergyBars && (
          <text x="60" y={height - 65} textAnchor="middle" fill="#e2e8f0" fontSize="11">Elastic PE</text>
        )}
      </svg>

      {/* External text labels using typo system */}
      <div className="relative" style={{ marginTop: '-60px', padding: '0 12px' }}>
        {/* Mass label */}
        <div
          className="absolute text-amber-900 font-bold"
          style={{
            fontSize: typo.label,
            left: '50%',
            transform: 'translateX(-50%)',
            top: `${pivotY + springLength + 22}px`,
            pointerEvents: 'none',
          }}
        >
          1 kg
        </div>

        {/* Displacement label */}
        {Math.abs(currentDisp) > 0.01 && (
          <div
            className="absolute text-emerald-400 font-bold"
            style={{
              fontSize: typo.small,
              right: '10px',
              top: `${pivotY + (baseLength + springLength + 20) / 2 - 6}px`,
              pointerEvents: 'none',
            }}
          >
            x = {(currentDisp * 100).toFixed(1)} cm
          </div>
        )}

        {/* Energy bar label */}
        {showEnergyBars && (
          <div
            className="absolute"
            style={{
              left: '20px',
              bottom: '20px',
              pointerEvents: 'none',
            }}
          >
            <div className="text-slate-400" style={{ fontSize: typo.label, textAlign: 'center', width: '100px' }}>
              Elastic PE
            </div>
            <div className="text-emerald-400 font-bold" style={{ fontSize: typo.body, textAlign: 'center', width: '100px', marginTop: '28px' }}>
              {currentPE.toFixed(2)} J
            </div>
          </div>
        )}

        {/* Formula labels */}
        <div
          className="absolute"
          style={{
            right: '12px',
            top: '20px',
            textAlign: 'right',
            pointerEvents: 'none',
          }}
        >
          <div className="text-slate-400 font-mono" style={{ fontSize: typo.small }}>
            PE = ½kx²
          </div>
          <div className="text-emerald-400 font-mono" style={{ fontSize: typo.label, marginTop: '4px' }}>
            = ½ × {springConstant} × {currentDisp.toFixed(2)}²
          </div>
        </div>
      </div>
    </div>
    );
  };

  // Phase labels
  const phaseLabels: Record<Phase, string> = {
    'hook': 'Hook',
    'predict': 'Predict',
    'play': 'Explore',
    'review': 'Review',
    'twist_predict': 'Twist',
    'twist_play': 'Twist Lab',
    'twist_review': 'Insight',
    'transfer': 'Transfer',
    'test': 'Test',
    'mastery': 'Mastery'
  };

  // Phase renders
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6 text-center" style={{ lineHeight: '1.6' }}>
      {/* Premium Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-emerald-400 text-sm font-medium">Physics Exploration</span>
      </div>

      {/* Gradient Title */}
      <h1 className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent mb-3`}>
        The Hidden Power of Springs
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg mb-8 max-w-md">
        Discover how elastic potential energy powers our world
      </p>

      {/* Premium Card */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl shadow-2xl">
        <div className="mb-6">
          {renderSpring(isMobile ? 280 : 350, isMobile ? 280 : 320)}
        </div>

        <p className="text-lg md:text-xl text-slate-300 mb-4">
          When you compress a spring, where does your effort go?
        </p>

        <p className="text-base md:text-lg text-emerald-400 font-medium mb-6">
          The spring stores energy - ready to release it all at once!
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => {
              setDisplacement(0.15);
              onGameEvent?.({ type: 'spring_compressed', data: { displacement: 0.15 } });
            }}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors"
            style={{ zIndex: 10 }}
          >
            Compress Spring
          </button>
          <button
            onClick={() => startRelease()}
            disabled={displacement < 0.05}
            className={`px-6 py-3 ${displacement >= 0.05 ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-600'} text-white font-semibold rounded-xl transition-colors`}
            style={{ zIndex: 10 }}
          >
            Release!
          </button>
        </div>
      </div>

      {/* Premium CTA Button */}
      <button
        onClick={() => goToPhase('predict')}
        className="group mt-8 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-lg font-semibold rounded-2xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] flex items-center gap-2"
        style={{ zIndex: 10 }}
      >
        Discover the Formula
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      {/* Subtle Hint */}
      <p className="mt-4 text-slate-500 text-sm">
        Tap to begin your physics journey
      </p>
    </div>
  );

  // Static spring visualization for predict phase (no animation)
  const renderStaticSpring = (width: number, height: number) => {
    const pivotX = width / 2;
    const pivotY = 40;
    const baseLength = 100;
    const staticDisp = 0.15;
    const compressionPixels = staticDisp * 400;
    const springLength = baseLength + compressionPixels;
    const coils = 12;
    const coilHeight = springLength / coils;
    const amplitude = 25;

    let springPath = `M ${pivotX} ${pivotY}`;
    for (let i = 0; i < coils; i++) {
      const y1 = pivotY + i * coilHeight + coilHeight / 4;
      const y2 = pivotY + i * coilHeight + coilHeight / 2;
      const y3 = pivotY + i * coilHeight + coilHeight * 3 / 4;
      const y4 = pivotY + (i + 1) * coilHeight;
      springPath += ` Q ${pivotX + amplitude} ${y1} ${pivotX} ${y2}`;
      springPath += ` Q ${pivotX - amplitude} ${y3} ${pivotX} ${y4}`;
    }

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="staticSpringMetal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="staticMassBlock" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={width} height={height} fill="#0f172a" rx="8" />
        <rect x={pivotX - 40} y="15" width="80" height="25" fill="#4b5563" rx="4" />
        <path d={springPath} fill="none" stroke="url(#staticSpringMetal)" strokeWidth="5" strokeLinecap="round" />
        <rect x={pivotX - 30} y={pivotY + springLength} width="60" height="40" rx="6" fill="url(#staticMassBlock)" />
        <text x={pivotX} y={pivotY + springLength + 25} textAnchor="middle" fill="#78350f" fontSize="12" fontWeight="bold">1 kg</text>
        <text x={pivotX + 55} y={pivotY + springLength / 2} fill="#e2e8f0" fontSize="11">Spring</text>
        <text x={pivotX + 60} y={pivotY + springLength / 2 + 14} fill="#e2e8f0" fontSize="11">x = 15 cm</text>
        <text x={width - 20} y="30" textAnchor="end" fill="#e2e8f0" fontSize="11">k = 100 N/m</text>
      </svg>
    );
  };

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6" style={{ lineHeight: '1.6' }}>
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-4`} style={{ color: '#f1f5f9' }}>Make Your Prediction</h2>

      {/* Progress indicator */}
      <div style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '16px' }}>Step 1 of 2: Initial Prediction</div>

      {/* Static diagram */}
      <div className="mb-4">
        {renderStaticSpring(isMobile ? 280 : 320, isMobile ? 200 : 220)}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-2xl mb-6">
        <p className="text-base md:text-lg mb-4" style={{ color: '#e2e8f0' }}>
          You compress a spring by 10 cm and it stores 5 Joules of energy.
        </p>
        <p className="text-base md:text-lg text-emerald-400 font-medium">
          If you compress it by 20 cm (double the distance), how much energy will it store?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: '5 Joules (same as before)' },
          { id: 'B', text: '10 Joules (double)' },
          { id: 'C', text: '20 Joules (quadruple)' },
          { id: 'D', text: '2.5 Joules (half)' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{
              padding: '16px',
              borderRadius: '12px',
              textAlign: 'left',
              transition: 'all 0.3s',
              minHeight: '44px',
              background: showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'C' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
                : showPredictionFeedback && option.id === 'C'
                ? 'rgba(16, 185, 129, 0.4)'
                : selectedPrediction === option.id
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(51, 65, 85, 0.5)',
              border: showPredictionFeedback && (selectedPrediction === option.id || option.id === 'C')
                ? option.id === 'C' ? '2px solid #34d399' : selectedPrediction === option.id ? '2px solid #f87171' : '2px solid transparent'
                : selectedPrediction === option.id
                ? '2px solid #10b981'
                : '2px solid transparent',
              zIndex: 10,
              cursor: showPredictionFeedback ? 'default' : 'pointer',
            }}
          >
            <span style={{ fontWeight: 'bold', color: '#ffffff' }}>{option.id}.</span>
            <span style={{ color: '#e2e8f0', marginLeft: '8px' }}>{option.text}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Energy goes up with the SQUARE of displacement!
          </p>
          <p style={{ color: '#cbd5e1', fontSize: '14px', marginTop: '8px' }}>
            Double the compression = 2 squared = 4x the energy. This is because PE = 1/2 k x squared
          </p>
          <button
            onClick={() => goToPhase('play')}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              background: 'linear-gradient(to right, #059669, #0d9488)',
              color: '#ffffff',
              fontWeight: '600',
              borderRadius: '12px',
              minHeight: '44px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-4 md:p-6" style={{ lineHeight: '1.6' }}>
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold mb-4`} style={{ color: '#f1f5f9' }}>Elastic Energy Laboratory</h2>

      {/* Observation guidance */}
      <div style={{
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '16px',
        maxWidth: '600px',
        width: '100%'
      }}>
        <p style={{ color: '#6ee7b7', fontSize: '14px', fontWeight: '500' }}>
          Observe: Adjust the spring constant and compression to see how energy changes. Watch how doubling compression quadruples the stored energy!
        </p>
      </div>

      {/* Real-world relevance */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '16px',
        maxWidth: '600px',
        width: '100%'
      }}>
        <p style={{ color: '#93c5fd', fontSize: '14px', fontWeight: '500' }}>
          Real-world application: This same principle powers everything from archery bows to car suspensions to mechanical watches. Understanding elastic potential energy helps engineers design better springs for countless applications.
        </p>
      </div>

      <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'} gap-4 max-w-4xl w-full`}>
        {/* Spring visualization */}
        <div className="bg-slate-800/50 rounded-2xl p-4">
          {renderSpring(isMobile ? 300 : 350, isMobile ? 300 : 350)}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Spring constant slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="block text-sm font-medium mb-2" style={{ color: '#e2e8f0' }}>
              Spring Constant (k): {springConstant} N/m
            </label>
            <input
              type="range"
              min="50"
              max="300"
              step="10"
              value={springConstant}
              onChange={(e) => {
                setSpringConstant(parseInt(e.target.value));
                onGameEvent?.({ type: 'parameter_changed', data: { springConstant: parseInt(e.target.value) } });
              }}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              style={{ width: '100%', height: '20px', touchAction: 'pan-y', accentColor: '#10b981' }}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: '#cbd5e1' }}>
              <span>Soft (50)</span>
              <span>Stiff (300)</span>
            </div>
          </div>

          {/* Displacement slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="block text-sm font-medium mb-2" style={{ color: '#e2e8f0' }}>
              Compression: {(displacement * 100).toFixed(0)} cm
            </label>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={displacement * 100}
              onChange={(e) => {
                setDisplacement(parseInt(e.target.value) / 100);
                onGameEvent?.({ type: 'spring_compressed', data: { displacement: parseInt(e.target.value) / 100 } });
              }}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              style={{ width: '100%', height: '20px', touchAction: 'pan-y', accentColor: '#10b981' }}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: '#cbd5e1' }}>
              <span>0 cm</span>
              <span>30 cm</span>
            </div>
          </div>

          {/* Energy calculation */}
          <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-emerald-400 mb-2">Energy Calculation</h3>
            <div className="font-mono space-y-1" style={{ color: '#e2e8f0' }}>
              <p>PE = 1/2 x k x x squared</p>
              <p>PE = 1/2 x {springConstant} x {displacement.toFixed(2)} squared</p>
              <p className="text-emerald-400 text-xl font-bold">PE = {elasticPE.toFixed(3)} J</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => startRelease()}
              disabled={displacement < 0.03}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                fontWeight: '600',
                minHeight: '44px',
                background: displacement >= 0.03 ? '#d97706' : '#475569',
                color: displacement >= 0.03 ? '#ffffff' : '#e2e8f0',
                border: 'none',
                cursor: displacement >= 0.03 ? 'pointer' : 'default',
              }}
            >
              Release Spring
            </button>
            <button
              onClick={() => setShowEnergyBars(!showEnergyBars)}
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                fontWeight: '600',
                minHeight: '44px',
                background: showEnergyBars ? '#059669' : '#475569',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Energy
            </button>
          </div>
        </div>
      </div>

      {/* Key insight */}
      <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 rounded-xl p-4 mt-6 max-w-2xl">
        <h3 className="text-lg font-semibold text-emerald-400 mb-2">Key Discovery</h3>
        <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
          <strong>PE = 1/2 k x squared</strong> - Energy grows with displacement SQUARED! Double the compression = 4x the energy. This is why springs are such effective energy storage devices.
        </p>
      </div>

      <button
        onClick={() => goToPhase('review')}
        style={{
          marginTop: '24px',
          padding: '12px 24px',
          background: 'linear-gradient(to right, #059669, #0d9488)',
          color: '#ffffff',
          fontWeight: '600',
          borderRadius: '12px',
          minHeight: '44px',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Review the Concepts
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-4 md:p-6" style={{ lineHeight: '1.6' }}>
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>Elastic Potential Energy Explained</h2>

      {/* Reference to user's prediction - always show to connect learning */}
      <div style={{
        background: selectedPrediction === 'C' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
        border: selectedPrediction === 'C' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '16px',
        maxWidth: '600px',
        width: '100%',
        textAlign: 'center',
      }}>
        <p style={{ color: selectedPrediction === 'C' ? '#6ee7b7' : '#fcd34d', fontSize: '14px', fontWeight: '500' }}>
          {selectedPrediction === 'C'
            ? 'As you predicted, doubling compression quadruples the stored energy due to the x² relationship.'
            : 'As you observed in the simulation, doubling compression quadruples energy - this is the key insight from PE = ½kx².'}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-5">
          <h3 className="text-lg font-bold text-emerald-400 mb-3">📐 The Formula</h3>
          <div className="space-y-2 text-slate-300 text-sm">
            <p className="text-xl font-mono text-center py-2 bg-slate-800/50 rounded">PE = ½kx²</p>
            <p><strong>k</strong> = Spring constant (N/m) - stiffness</p>
            <p><strong>x</strong> = Displacement from equilibrium (m)</p>
            <p><strong>PE</strong> = Elastic potential energy (Joules)</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-5">
          <h3 className="text-lg font-bold text-cyan-400 mb-3">📊 The x² Effect</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• 2× compression → 4× energy</li>
            <li>• 3× compression → 9× energy</li>
            <li>• 10× compression → 100× energy</li>
            <li>• Energy grows much faster than displacement!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-5">
          <h3 className="text-lg font-bold text-amber-400 mb-3">⚡ Energy Conservation</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Elastic PE converts to kinetic energy</li>
            <li>• KE = ½mv² when spring is released</li>
            <li>• Total energy is conserved (PE → KE → PE)</li>
            <li>• This creates oscillation!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-5">
          <h3 className="text-lg font-bold text-purple-400 mb-3">🔧 Work-Energy Connection</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Work done = Force × Distance</li>
            <li>• W = ∫F·dx = ∫kx·dx = ½kx²</li>
            <li>• Work you do becomes stored PE</li>
            <li>• PE can do work when released</li>
          </ul>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
        style={{ zIndex: 10 }}
      >
        Discover a Surprising Twist →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6" style={{ lineHeight: '1.6' }}>
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>The Twist Challenge</h2>

      {/* Static SVG visualization for twist concept */}
      <div className="mb-4">
        <svg width={isMobile ? 280 : 320} height={isMobile ? 160 : 180} viewBox={`0 0 ${isMobile ? 280 : 320} ${isMobile ? 160 : 180}`} style={{ display: 'block' }}>
          <defs>
            <linearGradient id="twistSpringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#d946ef" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="#0f172a" rx="8" />
          {/* Title at top */}
          <text x="160" y="18" textAnchor="middle" fill="#c4b5fd" fontSize="12" fontWeight="bold">Spring Compression Comparison</text>
          {/* Wall */}
          <rect x="20" y="40" width="15" height="100" fill="#4b5563" rx="2" />
          {/* Spring 1 (1mm compression) - wider Y oscillation for visibility */}
          <path d="M 35 70 Q 55 25 75 70 Q 95 115 115 70 Q 135 25 155 70" fill="none" stroke="url(#twistSpringGrad)" strokeWidth="4" strokeLinecap="round" />
          <rect x="155" y="55" width="30" height="30" rx="4" fill="#fbbf24" />
          <text x="170" y="75" textAnchor="middle" fill="#78350f" fontSize="11" fontWeight="bold">1kg</text>
          {/* Arrow and label for 1mm */}
          <line x1="155" y1="100" x2="35" y2="100" stroke="#22c55e" strokeWidth="1" strokeDasharray="3" />
          <text x="95" y="120" textAnchor="middle" fill="#22c55e" fontSize="11">x = 1mm → 50J</text>
          {/* Question mark for 2mm */}
          <text x="250" y="75" textAnchor="middle" fill="#c084fc" fontSize="24" fontWeight="bold">?</text>
          <text x="250" y="95" textAnchor="middle" fill="#e2e8f0" fontSize="11">x = 2mm → ??J</text>
          {/* Bottom annotation */}
          <line x1="20" y1="155" x2="300" y2="155" stroke="#334155" strokeWidth="1" />
          <text x="160" y="170" textAnchor="middle" fill="#94a3b8" fontSize="10">How does doubling compression affect stored energy?</text>
        </svg>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-2xl mb-6">
        <p className="text-base md:text-lg text-slate-300 mb-4">
          A spring has a very high spring constant k. You compress it just 1 mm but it stores 50 Joules!
        </p>
        <p className="text-base md:text-lg text-cyan-400 font-medium">
          What happens if you try to compress it to 2 mm? Is it twice as hard?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Yes, exactly twice as hard (linear relationship)' },
          { id: 'B', text: 'No, it requires 4× the force because F = kx increases linearly but you must push through 2× the distance' },
          { id: 'C', text: 'No, it requires 8× the force' },
          { id: 'D', text: 'It\'s actually easier the second millimeter' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{
              padding: '16px',
              borderRadius: '12px',
              textAlign: 'left',
              transition: 'all 0.3s',
              minHeight: '44px',
              zIndex: 10,
              background: showTwistFeedback && twistPrediction === option.id
                ? option.id === 'B' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
                : showTwistFeedback && option.id === 'B'
                ? 'rgba(16, 185, 129, 0.4)'
                : 'rgba(51, 65, 85, 0.5)',
              border: showTwistFeedback && (twistPrediction === option.id || option.id === 'B')
                ? option.id === 'B' ? '2px solid #34d399' : twistPrediction === option.id ? '2px solid #f87171' : '2px solid transparent'
                : '2px solid transparent',
              cursor: showTwistFeedback ? 'default' : 'pointer',
            }}
          >
            <span style={{ fontWeight: 'bold', color: '#ffffff' }}>{option.id}.</span>
            <span style={{ color: '#e2e8f0', marginLeft: '8px' }}>{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            ✓ Storing 4× the energy requires 4× the work!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            While force only doubles (F = kx), you push through twice the distance. Work = Force × Distance, so total work quadruples.
          </p>
          <button
            onClick={() => goToPhase('twist_play')}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              background: 'linear-gradient(to right, #9333ea, #db2777)',
              color: '#ffffff',
              fontWeight: '600',
              borderRadius: '12px',
              minHeight: '44px',
              border: 'none',
              cursor: 'pointer',
              zIndex: 10,
            }}
          >
            Explore This Effect
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-4 md:p-6" style={{ lineHeight: '1.6' }}>
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-4`}>Work-Energy Deep Dive</h2>

      {/* Observation guidance */}
      <div style={{
        background: 'rgba(139, 92, 246, 0.1)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '16px',
        maxWidth: '600px',
        width: '100%'
      }}>
        <p style={{ color: '#c4b5fd', fontSize: '14px', fontWeight: '500' }}>
          Observe: Study the force-displacement graph. Notice how the area under the line (work done) forms a triangle, leading to the quadratic relationship in the energy formula.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mb-6">
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-cyan-400 mb-3">Force vs. Displacement</h3>
          <svg viewBox="0 0 200 150" className="w-full">
            <rect width="200" height="150" fill="#0f172a" rx="8" />
            {/* Axes */}
            <line x1="30" y1="120" x2="180" y2="120" stroke="#64748b" strokeWidth="2" />
            <line x1="30" y1="120" x2="30" y2="20" stroke="#64748b" strokeWidth="2" />
            {/* Labels */}
            <text x="105" y="140" fill="#e2e8f0" fontSize="11" textAnchor="middle">Displacement (x)</text>
            <text x="15" y="70" fill="#e2e8f0" fontSize="11" transform="rotate(-90, 15, 70)">Force (F)</text>
            {/* F = kx line */}
            <line x1="30" y1="120" x2="170" y2="30" stroke="#22c55e" strokeWidth="3" />
            <text x="130" y="50" fill="#22c55e" fontSize="11">F = kx</text>
            {/* Shaded area (work) */}
            <polygon points="30,120 170,120 170,30" fill="#22c55e" opacity="0.2" />
            <text x="100" y="100" fill="#22c55e" fontSize="11" fontWeight="bold">Work = Area</text>
          </svg>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-purple-400 mb-3">Why x²?</h3>
          <div className="space-y-3 text-slate-300 text-sm">
            <p>Work = ∫F·dx from 0 to x</p>
            <p>Since F = kx:</p>
            <p className="font-mono bg-slate-700/50 p-2 rounded">W = ∫kx·dx = k·x²/2 = ½kx²</p>
            <p className="text-purple-400 mt-3">
              The area under F(x) is a triangle with base x and height kx. Area = ½ × base × height = ½kx²!
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-purple-400 mb-3">The Calculus Behind PE = ½kx²</h3>
        <div className="space-y-2 text-slate-300 text-sm">
          <p>1. Force increases linearly: F = kx</p>
          <p>2. Work is force integrated over distance: W = ∫F·dx</p>
          <p>3. Integrating: W = ∫₀ˣ kx dx = ½kx²</p>
          <p className="text-emerald-400 mt-3 font-medium">
            This is why doubling x gives 4× energy - the integration of a linear function is quadratic!
          </p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
        style={{ zIndex: 10 }}
      >
        Review Discovery →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-4 md:p-6" style={{ lineHeight: '1.6' }}>
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>Key Discovery</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">The Power of the Square</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            The x² in PE = ½kx² isn't just a mathematical curiosity - it has profound practical implications:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Energy density:</strong> Small additional compression stores disproportionately more energy</li>
            <li><strong>Danger zone:</strong> Highly compressed springs store enormous energy</li>
            <li><strong>Design limits:</strong> Engineers must consider stress concentrations at maximum compression</li>
            <li><strong>Efficiency:</strong> Springs are most efficient at storing energy per unit weight</li>
          </ul>
          <p className="text-emerald-400 font-medium mt-4">
            This quadratic relationship makes springs ideal for energy storage but requires careful engineering!
          </p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
        style={{ zIndex: 10 }}
      >
        Explore Real-World Applications →
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-4 md:p-6" style={{ lineHeight: '1.6' }}>
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold mb-4`} style={{ color: '#f1f5f9' }}>Real-World Applications</h2>

      {/* Progress indicator */}
      <div style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '16px' }}>
        App {activeAppIndex + 1} of {transferApps.length} | {completedApps.size}/{transferApps.length} completed
      </div>

      {/* App tabs */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {transferApps.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveAppIndex(index)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: '500',
              minHeight: '44px',
              background: activeAppIndex === index
                ? 'linear-gradient(to right, #059669, #0d9488)'
                : completedApps.has(index)
                ? 'rgba(16, 185, 129, 0.3)'
                : '#334155',
              color: activeAppIndex === index ? '#ffffff' : completedApps.has(index) ? '#34d399' : '#e2e8f0',
              border: completedApps.has(index) && activeAppIndex !== index ? '1px solid #10b981' : 'none',
              cursor: 'pointer',
            }}
          >
            {app.icon} {app.short}
          </button>
        ))}
      </div>

      {/* Active app content */}
      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-3xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{transferApps[activeAppIndex].icon}</span>
          <div>
            <h3 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>{transferApps[activeAppIndex].title}</h3>
            <p className="text-sm" style={{ color: '#cbd5e1' }}>{transferApps[activeAppIndex].tagline}</p>
          </div>
        </div>

        <p style={{ color: '#e2e8f0', marginBottom: '16px' }}>{transferApps[activeAppIndex].description}</p>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-900/50 rounded-xl p-3">
            <h4 className="text-sm font-semibold text-emerald-400 mb-2">Physics Connection</h4>
            <p style={{ color: '#cbd5e1', fontSize: '14px' }}>{transferApps[activeAppIndex].connection}</p>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-3">
            <h4 className="text-sm font-semibold text-amber-400 mb-2">How It Works</h4>
            <p style={{ color: '#cbd5e1', fontSize: '14px' }}>{transferApps[activeAppIndex].howItWorks}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-900/50 rounded-xl p-3">
            <h4 className="text-sm font-semibold text-cyan-400 mb-2">Key Stats</h4>
            <ul style={{ color: '#cbd5e1', fontSize: '14px' }} className="space-y-1">
              {transferApps[activeAppIndex].stats.map((stat, i) => (
                <li key={i}>- {stat}</li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-3">
            <h4 className="text-sm font-semibold text-purple-400 mb-2">Examples</h4>
            <ul style={{ color: '#cbd5e1', fontSize: '14px' }} className="space-y-1">
              {transferApps[activeAppIndex].examples.map((ex, i) => (
                <li key={i}>- {ex}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-xl p-3 mb-4">
          <h4 className="text-sm font-semibold text-pink-400 mb-2">Industry Leaders</h4>
          <div className="flex flex-wrap gap-2">
            {transferApps[activeAppIndex].companies.map((company, i) => (
              <span key={i} className="px-3 py-1 bg-slate-800 rounded-full text-sm" style={{ color: '#e2e8f0' }}>
                {company}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-3">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">Future Impact</h4>
          <p style={{ color: '#cbd5e1', fontSize: '14px' }}>{transferApps[activeAppIndex].futureImpact}</p>
        </div>

        {!completedApps.has(activeAppIndex) && (
          <button
            onClick={() => handleAppComplete(activeAppIndex)}
            style={{
              marginTop: '16px',
              padding: '12px',
              width: '100%',
              background: '#059669',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: '500',
              minHeight: '44px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Got It - Mark as Understood
          </button>
        )}
      </div>

      {/* Progress dots */}
      <div className="mt-6 flex items-center gap-2">
        <span style={{ color: '#cbd5e1' }}>Progress:</span>
        <div className="flex gap-1">
          {transferApps.map((_, i) => (
            <div
              key={i}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: completedApps.has(i) ? '#10b981' : '#475569',
              }}
            />
          ))}
        </div>
        <span style={{ color: '#cbd5e1' }}>{completedApps.size}/{transferApps.length}</span>
      </div>

      {/* Next Application button */}
      {activeAppIndex < transferApps.length - 1 && (
        <button
          onClick={() => setActiveAppIndex(activeAppIndex + 1)}
          style={{
            marginTop: '16px',
            padding: '12px 24px',
            background: '#475569',
            color: '#ffffff',
            fontWeight: '600',
            borderRadius: '12px',
            minHeight: '44px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Next Application
        </button>
      )}

      {completedApps.size >= 4 && (
        <button
          onClick={() => goToPhase('test')}
          style={{
            marginTop: '24px',
            padding: '12px 24px',
            background: 'linear-gradient(to right, #059669, #0d9488)',
            color: '#ffffff',
            fontWeight: '600',
            borderRadius: '12px',
            minHeight: '44px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Take the Knowledge Test
        </button>
      )}
    </div>
  );

  const renderTest = () => {
    const answeredCount = testAnswers.filter(a => a !== -1).length;

    return (
      <div className="flex flex-col items-center p-4 md:p-6" style={{ lineHeight: '1.6' }}>
        <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold mb-4`} style={{ color: '#f1f5f9' }}>Knowledge Assessment</h2>

        {!showTestResults ? (
          <div className="space-y-4 max-w-2xl w-full">
            {/* Progress indicator */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              padding: '12px 16px',
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '12px',
            }}>
              <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
                Question {currentQuestionIndex + 1} of {testQuestions.length}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {testQuestions.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: testAnswers[i] !== -1 ? '#10b981' : i === currentQuestionIndex ? '#3b82f6' : '#475569',
                    }}
                  />
                ))}
              </div>
              <span style={{ color: '#cbd5e1', fontSize: '14px' }}>
                {answeredCount}/{testQuestions.length} answered
              </span>
            </div>

            {testQuestions.map((q, qIndex) => (
              <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4" style={{ borderRadius: '12px' }}>
                <p style={{ color: '#cbd5e1', fontSize: '14px', fontStyle: 'italic', marginBottom: '8px' }}>{q.scenario}</p>
                <p style={{ color: '#f1f5f9', fontWeight: '500', marginBottom: '12px' }}>
                  Q{qIndex + 1} of {testQuestions.length}: {q.question}
                </p>
                <div className="grid gap-2">
                  {q.options.map((option, oIndex) => (
                    <button
                      key={oIndex}
                      onClick={() => {
                        handleTestAnswer(qIndex, oIndex);
                        setCurrentQuestionIndex(qIndex);
                      }}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        textAlign: 'left',
                        fontSize: '14px',
                        minHeight: '44px',
                        background: testAnswers[qIndex] === oIndex ? '#059669' : 'rgba(51, 65, 85, 0.5)',
                        color: testAnswers[qIndex] === oIndex ? '#ffffff' : '#e2e8f0',
                        border: testAnswers[qIndex] === oIndex ? '2px solid #34d399' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {String.fromCharCode(65 + oIndex)}) {option.text}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={() => {
                setShowTestResults(true);
                onGameEvent?.({ type: 'test_completed', data: { score: calculateScore() } });
              }}
              disabled={testAnswers.includes(-1)}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '18px',
                minHeight: '52px',
                background: testAnswers.includes(-1) ? '#334155' : 'linear-gradient(to right, #059669, #0d9488)',
                color: testAnswers.includes(-1) ? '#64748b' : '#ffffff',
                border: 'none',
                cursor: testAnswers.includes(-1) ? 'not-allowed' : 'pointer',
              }}
            >
              Submit Answers
            </button>
          </div>
        ) : (
          <div className="max-w-2xl w-full" style={{ maxHeight: '70vh', overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
            <div className="bg-slate-800/50 rounded-2xl p-6 text-center mb-6">
              <div className="text-6xl mb-4">{calculateScore() >= 7 ? 'Excellent!' : 'Keep Learning'}</div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: '#f1f5f9' }}>
                Score: {calculateScore()}/10
              </h3>
              <p style={{ color: '#e2e8f0', marginBottom: '24px' }}>
                {calculateScore() >= 7
                  ? 'You have mastered Elastic Potential Energy!'
                  : 'Review the concepts and try again.'}
              </p>

              {calculateScore() >= 7 ? (
                <button
                  onClick={() => goToPhase('mastery')}
                  style={{
                    padding: '16px 32px',
                    background: 'linear-gradient(to right, #059669, #0d9488)',
                    color: '#ffffff',
                    fontWeight: '600',
                    borderRadius: '12px',
                    minHeight: '52px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Complete Lesson
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowTestResults(false);
                    setTestAnswers(Array(10).fill(-1));
                    setCurrentQuestionIndex(0);
                    goToPhase('review');
                  }}
                  style={{
                    padding: '16px 32px',
                    background: 'linear-gradient(to right, #059669, #0d9488)',
                    color: '#ffffff',
                    fontWeight: '600',
                    borderRadius: '12px',
                    minHeight: '52px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Review and Try Again
                </button>
              )}
            </div>

            {/* Show explanations */}
            <div className="space-y-3">
              <h4 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>Review Answers:</h4>
              {testQuestions.map((q, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const isCorrect = q.options[userAnswer]?.correct;
                return (
                  <div key={qIndex} style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    border: isCorrect ? '1px solid #10b981' : '1px solid #ef4444',
                  }}>
                    <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '4px' }}>Question {qIndex + 1}: {q.question}</p>
                    <p style={{ color: isCorrect ? '#34d399' : '#f87171', fontSize: '14px' }}>
                      Your answer: {q.options[userAnswer]?.text}
                    </p>
                    {!isCorrect && (
                      <p style={{ color: '#34d399', fontSize: '14px' }}>
                        Correct: {q.options.find(o => o.correct)?.text}
                      </p>
                    )}
                    <p style={{ color: '#e2e8f0', fontSize: '12px', marginTop: '8px' }}>{q.explanation}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6 text-center" style={{ lineHeight: '1.6' }}>
      <div className="bg-gradient-to-br from-emerald-900/50 via-teal-900/50 to-cyan-900/50 rounded-3xl p-6 md:p-8 max-w-2xl">
        <div className="text-7xl md:text-8xl mb-6">🔋</div>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white mb-4`}>
          Elastic Energy Master!
        </h1>
        <p className="text-lg md:text-xl text-slate-300 mb-6">
          You've mastered the physics of elastic potential energy storage!
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-2xl mb-1">📐</div>
            <p className="text-xs text-slate-300">PE = ½kx²</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-2xl mb-1">📊</div>
            <p className="text-xs text-slate-300">Quadratic Growth</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-2xl mb-1">⚡</div>
            <p className="text-xs text-slate-300">Energy Storage</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-2xl mb-1">🔄</div>
            <p className="text-xs text-slate-300">Conservation</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              setPhase('hook');
              setShowPredictionFeedback(false);
              setSelectedPrediction(null);
              setTwistPrediction(null);
              setShowTwistFeedback(false);
              setTestAnswers(Array(10).fill(-1));
              setShowTestResults(false);
              setCompletedApps(new Set());
              onGameEvent?.({ type: 'mastery_achieved', data: {} });
            }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
            style={{ zIndex: 10 }}
          >
            ↺ Explore Again
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a', color: '#ffffff', position: 'relative', overflow: 'hidden' }}>
      {/* Premium Background Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/50 via-transparent to-teal-950/50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />

      {/* Ambient Glow Circles */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      <div className="absolute top-3/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />

      {/* Navigation bar - Fixed position with proper z-index */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backdropFilter: 'blur(12px)',
        background: 'rgba(15, 23, 42, 0.85)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', maxWidth: '896px', margin: '0 auto' }}>
          <span style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: '500', color: '#cbd5e1' }}>
            Elastic Potential Energy
          </span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} data-testid="nav-dots">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                data-nav-dot={p}
                aria-label={`Go to ${phaseLabels[p]} phase`}
                style={{
                  height: '8px',
                  borderRadius: '9999px',
                  width: phase === p ? '24px' : '8px',
                  background: phase === p ? '#10b981' : phaseOrder.indexOf(p) < phaseOrder.indexOf(phase) ? '#10b981' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  minHeight: '8px',
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: isMobile ? '12px' : '14px', color: '#e2e8f0' }}>
            {phaseLabels[phase]}
          </span>
        </div>
      </div>

      {/* Bottom navigation bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.3)',
        padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '896px', margin: '0 auto' }}>
          <button
            onClick={() => {
              const currentIndex = phaseOrder.indexOf(phase);
              if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]);
            }}
            disabled={phaseOrder.indexOf(phase) === 0}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: '600',
              minHeight: '44px',
              background: phaseOrder.indexOf(phase) === 0 ? '#334155' : '#475569',
              color: phaseOrder.indexOf(phase) === 0 ? '#64748b' : '#e2e8f0',
              border: 'none',
              cursor: phaseOrder.indexOf(phase) === 0 ? 'default' : 'pointer',
              opacity: phaseOrder.indexOf(phase) === 0 ? 0.5 : 1,
            }}
          >
            Back
          </button>
          <button
            onClick={() => {
              const currentIndex = phaseOrder.indexOf(phase);
              if (currentIndex < phaseOrder.length - 1) goToPhase(phaseOrder[currentIndex + 1]);
            }}
            disabled={phaseOrder.indexOf(phase) === phaseOrder.length - 1 || phase === 'test'}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: '600',
              minHeight: '44px',
              background: (phaseOrder.indexOf(phase) === phaseOrder.length - 1 || phase === 'test') ? '#334155' : 'linear-gradient(to right, #059669, #0d9488)',
              color: (phaseOrder.indexOf(phase) === phaseOrder.length - 1 || phase === 'test') ? '#64748b' : '#ffffff',
              border: 'none',
              cursor: (phaseOrder.indexOf(phase) === phaseOrder.length - 1 || phase === 'test') ? 'not-allowed' : 'pointer',
              opacity: phase === 'test' ? 0.4 : 1,
            }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Main content with proper padding for fixed nav */}
      <div style={{ position: 'relative', zIndex: 10, paddingTop: '56px', paddingBottom: '80px', overflowY: 'auto', flex: 1 }}>
        {phase === 'hook' && renderHook()}
        {phase === 'predict' && renderPredict()}
        {phase === 'play' && renderPlay()}
        {phase === 'review' && renderReview()}
        {phase === 'twist_predict' && renderTwistPredict()}
        {phase === 'twist_play' && renderTwistPlay()}
        {phase === 'twist_review' && renderTwistReview()}
        {phase === 'transfer' && renderTransfer()}
        {phase === 'test' && renderTest()}
        {phase === 'mastery' && renderMastery()}
      </div>
    </div>
  );
};

export default ElasticPotentialEnergyRenderer;
