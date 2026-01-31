import React, { useState, useEffect, useCallback, useRef } from 'react';

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'prediction_correct'
  | 'prediction_incorrect'
  | 'twist_prediction_made'
  | 'twist_correct'
  | 'twist_incorrect'
  | 'test_answer'
  | 'test_complete'
  | 'app_explored'
  | 'mastery_achieved'
  | 'animation_started'
  | 'animation_complete'
  | 'sound_played'
  | 'navigation'
  | 'entropy_calculated'
  | 'microstates_changed'
  | 'temperature_changed'
  | 'heat_transferred'
  | 'simulation_started'
  | 'disorder_visualized';

// Numeric phases: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Lab', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Lab', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
};

interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string;
  stats: { value: string; label: string }[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

interface Props {
  onGameEvent?: (event: { type: GameEventType; data?: Record<string, unknown> }) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  side: 'left' | 'right' | 'mixed';
}

const EntropyRenderer: React.FC<Props> = ({
  onGameEvent,
  currentPhase,
  onPhaseComplete
}) => {
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Entropy simulation states
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [barrierRemoved, setBarrierRemoved] = useState(false);
  const [numParticles, setNumParticles] = useState(20);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const navigationLockRef = useRef(false);
  const lastNavigationRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);

  // Boltzmann constant (for display, using simplified units)
  const k_B = 1.38e-23; // J/K

  // Initialize particles
  const initializeParticles = useCallback((count: number, separated: boolean = true) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const isLeftSide = separated ? i < count / 2 : Math.random() > 0.5;
      newParticles.push({
        x: separated ? (isLeftSide ? 20 + Math.random() * 70 : 110 + Math.random() * 70) : 20 + Math.random() * 160,
        y: 20 + Math.random() * 110,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        side: isLeftSide ? 'left' : 'right'
      });
    }
    return newParticles;
  }, []);

  // Calculate current entropy (simplified)
  const calculateEntropy = useCallback(() => {
    if (particles.length === 0) return 0;

    const leftCount = particles.filter(p => p.x < 100).length;
    const rightCount = particles.length - leftCount;
    const total = particles.length;

    if (leftCount === 0 || rightCount === 0) return 0;

    // Using mixing entropy formula
    const pLeft = leftCount / total;
    const pRight = rightCount / total;
    const S = -total * (pLeft * Math.log(pLeft) + pRight * Math.log(pRight));

    return S;
  }, [particles]);

  // Calculate number of microstates (simplified)
  const calculateMicrostates = useCallback(() => {
    const n = particles.length;
    const k = particles.filter(p => p.x < 100).length;
    // Binomial coefficient approximation using Stirling
    if (k === 0 || k === n) return 1;
    const logOmega = n * Math.log(n) - k * Math.log(k) - (n - k) * Math.log(n - k);
    return Math.round(Math.exp(logOmega));
  }, [particles]);

  // Check for mobile viewport
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

  // Sync with external phase control
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  // Initialize particles on mount
  useEffect(() => {
    setParticles(initializeParticles(numParticles, true));
    setBarrierRemoved(false);
    setTimeElapsed(0);
  }, [numParticles, initializeParticles]);

  // Particle animation
  useEffect(() => {
    if (!isSimulating) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = () => {
      setParticles(prev => {
        return prev.map(p => {
          let newX = p.x + p.vx;
          let newY = p.y + p.vy;
          let newVx = p.vx;
          let newVy = p.vy;

          // Wall collisions
          if (newX < 10 || newX > 190) {
            newVx = -newVx;
            newX = Math.max(10, Math.min(190, newX));
          }
          if (newY < 10 || newY > 140) {
            newVy = -newVy;
            newY = Math.max(10, Math.min(140, newY));
          }

          // Barrier collision (if not removed)
          if (!barrierRemoved) {
            if (p.x < 100 && newX >= 100) {
              newVx = -newVx;
              newX = 99;
            } else if (p.x >= 100 && newX < 100) {
              newVx = -newVx;
              newX = 101;
            }
          }

          return {
            ...p,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
            side: newX < 100 ? 'left' : 'right'
          };
        });
      });

      setTimeElapsed(prev => prev + 1);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSimulating, barrierRemoved]);

  // Initialize audio context
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
    };

    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });

    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const playSound = useCallback((soundType: 'correct' | 'incorrect' | 'transition' | 'complete' | 'barrier' | 'mix') => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    switch (soundType) {
      case 'correct':
        oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
        oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
      case 'incorrect':
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
      case 'transition':
        oscillator.frequency.setValueAtTime(440, ctx.currentTime);
        oscillator.frequency.setValueAtTime(550, ctx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
        break;
      case 'complete':
        oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
        oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.4);
        break;
      case 'barrier':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(150, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
        break;
      case 'mix':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, ctx.currentTime);
        oscillator.frequency.setValueAtTime(400, ctx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(350, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
    }

    onGameEvent?.({ type: 'sound_played', data: { soundType } });
  }, [onGameEvent]);

  const goToPhase = useCallback((newPhase: number) => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 400) return;
    if (navigationLockRef.current) return;

    lastNavigationRef.current = now;
    navigationLockRef.current = true;

    playSound('transition');
    setPhase(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
    onPhaseComplete?.(newPhase);

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  }, [playSound, onGameEvent, onPhaseComplete]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 400) return;
    lastNavigationRef.current = now;

    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);

    const isCorrect = prediction === 'C';
    playSound(isCorrect ? 'correct' : 'incorrect');
    onGameEvent?.({
      type: isCorrect ? 'prediction_correct' : 'prediction_incorrect',
      data: { prediction }
    });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 400) return;
    lastNavigationRef.current = now;

    setTwistPrediction(prediction);
    setShowTwistFeedback(true);

    const isCorrect = prediction === 'B';
    playSound(isCorrect ? 'correct' : 'incorrect');
    onGameEvent?.({
      type: isCorrect ? 'twist_correct' : 'twist_incorrect',
      data: { prediction }
    });
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 400) return;
    lastNavigationRef.current = now;

    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });

    onGameEvent?.({ type: 'test_answer', data: { questionIndex, answerIndex } });
  }, [onGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 400) return;
    lastNavigationRef.current = now;

    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'app_explored', data: { appIndex } });
  }, [playSound, onGameEvent]);

  const removeBarrier = useCallback(() => {
    setBarrierRemoved(true);
    playSound('barrier');
    onGameEvent?.({ type: 'simulation_started', data: { barrierRemoved: true } });
  }, [playSound, onGameEvent]);

  const resetSimulation = useCallback(() => {
    setParticles(initializeParticles(numParticles, true));
    setBarrierRemoved(false);
    setTimeElapsed(0);
    setIsSimulating(false);
  }, [numParticles, initializeParticles]);

  const testQuestions: TestQuestion[] = [
    {
      scenario: "A chemist mixes two different gases in an insulated container. Before mixing, each gas is in its own compartment at the same temperature and pressure.",
      question: "What happens to the total entropy of the system after the barrier is removed?",
      options: [
        { text: "Decreases because mixing creates order", correct: false },
        { text: "Stays the same because energy is conserved", correct: false },
        { text: "Increases because there are more possible arrangements", correct: true },
        { text: "Cannot be determined without knowing the gas types", correct: false }
      ],
      explanation: "Mixing always increases entropy because the number of possible microstates (ways particles can arrange themselves) dramatically increases when they have access to the full volume."
    },
    {
      scenario: "A hot cup of coffee is placed in a room-temperature environment. Over time, it cools down to room temperature.",
      question: "How does the total entropy of the universe change during this process?",
      options: [
        { text: "Decreases because the coffee becomes more ordered", correct: false },
        { text: "Increases because heat flows from hot to cold", correct: true },
        { text: "Stays the same because no work is done", correct: false },
        { text: "First increases then decreases", correct: false }
      ],
      explanation: "Heat flowing from hot to cold is an irreversible process that increases total entropy. The entropy gained by the room exceeds the entropy lost by the coffee."
    },
    {
      scenario: "An ice cube at 0°C absorbs 100 J of heat and melts into water, still at 0°C.",
      question: "What is the entropy change of the ice?",
      options: [
        { text: "Zero because temperature didn't change", correct: false },
        { text: "Negative because ice is more ordered", correct: false },
        { text: "Positive because liquid has more microstates", correct: true },
        { text: "Undefined at phase transitions", correct: false }
      ],
      explanation: "ΔS = Q/T = 100J/273K ≈ 0.37 J/K. Even at constant temperature, the phase change increases entropy because liquid molecules have many more possible arrangements than the crystalline solid."
    },
    {
      scenario: "A physicist proposes a machine that spontaneously transfers heat from a cold reservoir to a hot one without any external work input.",
      question: "Why is this machine impossible according to thermodynamics?",
      options: [
        { text: "Energy would not be conserved", correct: false },
        { text: "It would violate the second law (entropy would decrease)", correct: true },
        { text: "Heat cannot flow through a vacuum", correct: false },
        { text: "The machine would require infinite power", correct: false }
      ],
      explanation: "The second law states that heat spontaneously flows from hot to cold, not vice versa. Reversing this would decrease total entropy, which is forbidden without external work input."
    },
    {
      scenario: "A deck of cards starts perfectly ordered (all suits grouped and in sequence). After shuffling many times, it becomes disordered.",
      question: "Could the deck ever return to its perfectly ordered state through random shuffling alone?",
      options: [
        { text: "No, it's physically impossible", correct: false },
        { text: "Yes, but it's extremely improbable (statistically forbidden)", correct: true },
        { text: "Yes, after exactly 52! shuffles", correct: false },
        { text: "Only if shuffled counterclockwise", correct: false }
      ],
      explanation: "It's not forbidden by physical laws—just incredibly improbable. With 52! ≈ 8×10⁶⁷ possible arrangements, the chance of returning to one specific order is astronomically small."
    },
    {
      scenario: "A living cell maintains highly ordered internal structures despite the second law of thermodynamics.",
      question: "How does this not violate the second law?",
      options: [
        { text: "Living things are exempt from thermodynamics", correct: false },
        { text: "Cells create local order by exporting disorder (heat, waste) to surroundings", correct: true },
        { text: "The second law only applies to closed systems, and cells are open", correct: false },
        { text: "Biological processes are reversible", correct: false }
      ],
      explanation: "Cells are open systems that take in low-entropy food and export high-entropy waste and heat. Total entropy of cell + surroundings always increases."
    },
    {
      scenario: "A computer erases 1 bit of information from its memory.",
      question: "According to Landauer's principle, what must happen?",
      options: [
        { text: "Nothing—information is not physical", correct: false },
        { text: "At least kT·ln(2) joules of heat must be released to the environment", correct: true },
        { text: "The computer must cool down", correct: false },
        { text: "Energy is destroyed with the information", correct: false }
      ],
      explanation: "Erasing information increases the computer's entropy, which must be compensated by releasing at least kT·ln(2) ≈ 3×10⁻²¹ J per bit as heat. Information has a physical, thermodynamic cost."
    },
    {
      scenario: "An engineer claims to have built a perpetual motion machine that extracts work from a single heat reservoir without any other effects.",
      question: "This violates which statement?",
      options: [
        { text: "First law of thermodynamics", correct: false },
        { text: "Kelvin-Planck statement of the second law", correct: true },
        { text: "Conservation of momentum", correct: false },
        { text: "Newton's third law", correct: false }
      ],
      explanation: "The Kelvin-Planck statement says it's impossible to extract work from a single heat reservoir in a cycle with no other effect. Some energy must always be rejected to a cold reservoir."
    },
    {
      scenario: "The observable universe has been expanding and cooling since the Big Bang. It started in a very low-entropy state.",
      question: "What is the 'heat death' hypothesis about the far future?",
      options: [
        { text: "The universe will become too hot for life", correct: false },
        { text: "Maximum entropy—all processes stop, no free energy available", correct: true },
        { text: "The universe will collapse back to a point", correct: false },
        { text: "Stars will burn even hotter", correct: false }
      ],
      explanation: "As entropy approaches maximum, temperature gradients disappear, no work can be extracted, and all organized structures decay. The universe reaches thermodynamic equilibrium—maximum disorder."
    },
    {
      scenario: "A chemist calculates that a proposed reaction has ΔG (Gibbs free energy change) = -50 kJ/mol at room temperature.",
      question: "What can be concluded about this reaction?",
      options: [
        { text: "It will not occur spontaneously", correct: false },
        { text: "It will occur spontaneously (is thermodynamically favorable)", correct: true },
        { text: "Nothing—ΔG doesn't predict spontaneity", correct: false },
        { text: "It requires a catalyst to proceed", correct: false }
      ],
      explanation: "Negative ΔG means the process is spontaneous at constant T and P. ΔG = ΔH - TΔS combines enthalpy and entropy into a single criterion for spontaneity."
    }
  ];

  const transferApps: TransferApp[] = [
    {
      icon: "🧬",
      title: "Biochemistry & Life",
      short: "Life",
      tagline: "How living systems create order from chaos",
      description: "Living organisms are far-from-equilibrium systems that maintain internal order by continuously increasing entropy in their surroundings through metabolism.",
      connection: "Cells import low-entropy nutrients (organized chemical bonds) and export high-entropy waste (CO₂, heat). The net effect always increases total entropy.",
      howItWorks: "ATP hydrolysis provides the thermodynamic driving force for ordering processes. Every protein fold, every DNA replication pays an entropy cost to the environment.",
      stats: [
        { value: "~10⁷", label: "ATP molecules/cell/second" },
        { value: "37°C", label: "Human body temp (waste heat)" },
        { value: "~100W", label: "Human metabolic heat output" },
        { value: "~10¹⁴", label: "Cells in human body" }
      ],
      examples: [
        "Protein folding (local order, global disorder)",
        "DNA replication and repair",
        "Photosynthesis capturing low-entropy light",
        "Active transport against concentration gradients"
      ],
      companies: ["Moderna", "CRISPR Therapeutics", "Illumina", "Thermo Fisher", "Genentech"],
      futureImpact: "Understanding entropy in biology enables synthetic biology, artificial cells, and potentially reversing aging by maintaining cellular order.",
      color: "from-green-600 to-emerald-600"
    },
    {
      icon: "💻",
      title: "Information & Computing",
      short: "Computing",
      tagline: "The thermodynamics of bits",
      description: "Information is physical. Every bit erased, every computation performed, has a minimum thermodynamic cost governed by entropy.",
      connection: "Landauer's principle: erasing 1 bit requires dissipating at least kT·ln(2) energy. Reversible computing could theoretically avoid this cost.",
      howItWorks: "Modern computers waste ~1 million times the Landauer limit due to irreversible logic gates. The heat from data centers is pure entropy being exported.",
      stats: [
        { value: "3×10⁻²¹J", label: "Landauer limit per bit" },
        { value: "~1%", label: "World electricity for data centers" },
        { value: "10²¹", label: "Bits stored globally" },
        { value: "2030", label: "Computing may hit entropy limits" }
      ],
      examples: [
        "Data center cooling requirements",
        "CPU heat dissipation",
        "Quantum computing and reversibility",
        "Maxwell's demon thought experiment"
      ],
      companies: ["Intel", "NVIDIA", "Google", "IBM", "Microsoft"],
      futureImpact: "Reversible computing and quantum computers could dramatically reduce the thermodynamic cost of computation, enabling far more powerful systems.",
      color: "from-blue-600 to-cyan-600"
    },
    {
      icon: "🌡️",
      title: "Heat Engines & Efficiency",
      short: "Engines",
      tagline: "Why perfect efficiency is impossible",
      description: "Heat engines convert thermal energy to work, but entropy limits their maximum efficiency. Some heat must always be rejected to a cold reservoir.",
      connection: "Carnot efficiency η = 1 - T_cold/T_hot sets the absolute maximum. Real engines achieve 30-50% of this due to irreversibilities that create extra entropy.",
      howItWorks: "The second law requires that Q_cold/T_cold ≥ Q_hot/T_hot. This inequality means some heat is always 'wasted' as the entropy price for doing work.",
      stats: [
        { value: "~40%", label: "Best coal plant efficiency" },
        { value: "~60%", label: "Combined cycle gas turbine" },
        { value: "100%", label: "Impossible (Carnot limit)" },
        { value: "25%", label: "Car engine typical efficiency" }
      ],
      examples: [
        "Power plant design optimization",
        "Car engine thermodynamics",
        "Refrigerator and heat pump COP",
        "Waste heat recovery systems"
      ],
      companies: ["GE Power", "Siemens Energy", "Mitsubishi Power", "Tesla", "Toyota"],
      futureImpact: "Waste heat recovery and thermoelectric generators could capture entropy being thrown away, improving overall energy system efficiency by 20-40%.",
      color: "from-orange-600 to-red-600"
    },
    {
      icon: "🌌",
      title: "Cosmology & Arrow of Time",
      short: "Cosmology",
      tagline: "Why time flows forward",
      description: "Entropy gives time its direction. The universe started in an extraordinarily low-entropy state (Big Bang) and has been increasing toward maximum entropy ever since.",
      connection: "The 'arrow of time'—why we remember the past but not the future—emerges from entropy always increasing in closed systems.",
      howItWorks: "Our memories, aging, and even causality itself are manifestations of the second law. We are beings who exist during the entropy increase phase of the universe.",
      stats: [
        { value: "10⁻⁴³s", label: "Planck time (earliest)" },
        { value: "10¹²⁰", label: "Universe entropy estimate" },
        { value: "10¹⁰⁰", label: "Years to heat death" },
        { value: "1", label: "Direction of time" }
      ],
      examples: [
        "Cosmic microwave background uniformity",
        "Black hole thermodynamics",
        "Heat death of the universe",
        "Why we age and remember the past"
      ],
      companies: ["NASA", "ESA", "SpaceX", "LIGO", "CERN"],
      futureImpact: "Understanding cosmological entropy may reveal why the Big Bang was low-entropy, possibly pointing to pre-Big-Bang physics or multiverse theories.",
      color: "from-purple-600 to-indigo-600"
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  const renderParticleSimulation = (width: number = 200, height: number = 150) => {
    const leftCount = particles.filter(p => p.x < 100).length;
    const rightCount = particles.length - leftCount;
    const entropy = calculateEntropy();
    const maxEntropy = numParticles * Math.log(2); // Maximum when evenly distributed

    return (
      <svg width={width} height={height} className="mx-auto">
        <defs>
          <linearGradient id="entropyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Container */}
        <rect x="5" y="5" width={width - 10} height={height - 10} rx="8"
              fill="#0f172a" stroke="#334155" strokeWidth="2" />

        {/* Barrier (if not removed) */}
        {!barrierRemoved && (
          <line x1={width/2} y1="10" x2={width/2} y2={height - 10}
                stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
        )}

        {/* Barrier opening animation */}
        {barrierRemoved && (
          <line x1={width/2} y1="10" x2={width/2} y2={height - 10}
                stroke="#64748b" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        )}

        {/* Particles */}
        {particles.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="5"
            fill={p.x < 100 ? "#3b82f6" : "#ef4444"}
            filter="url(#glow)"
          />
        ))}

        {/* Labels */}
        <text x={width * 0.25} y={height - 3} textAnchor="middle"
              fill="#3b82f6" fontSize="10" fontWeight="bold">{leftCount}</text>
        <text x={width * 0.75} y={height - 3} textAnchor="middle"
              fill="#ef4444" fontSize="10" fontWeight="bold">{rightCount}</text>

        {/* Entropy bar */}
        <rect x="10" y="3" width={width - 20} height="4" rx="2" fill="#1e293b" />
        <rect x="10" y="3" width={(width - 20) * (entropy / maxEntropy)} height="4" rx="2"
              fill="url(#entropyGrad)" />
      </svg>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      {/* Premium Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
        <span className="text-purple-400 text-sm font-medium">Thermodynamics</span>
      </div>

      {/* Gradient Title */}
      <h1 className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-3`}>
        Entropy: The Arrow of Time
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg mb-8 max-w-md">
        Explore the fundamental law that gives time its direction
      </p>

      {/* Premium Card */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl shadow-2xl">
        {renderParticleSimulation(isMobile ? 280 : 320, 180)}

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-cyan-400">{calculateEntropy().toFixed(2)}</div>
            <div className="text-sm text-slate-400">Entropy (S)</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-400">{calculateMicrostates()}</div>
            <div className="text-sm text-slate-400">Microstates (Omega)</div>
          </div>
        </div>

        <p className="text-xl text-slate-300 mt-6 mb-4">
          Blue particles on the left, red on the right. What happens when we remove the barrier?
        </p>
        <p className="text-lg text-purple-400 font-medium">
          Why don't they ever spontaneously separate again?
        </p>

        <div className="flex gap-4 mt-4 justify-center flex-wrap">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              removeBarrier();
              setIsSimulating(true);
            }}
            disabled={barrierRemoved}
            className={`px-6 py-3 ${barrierRemoved ? 'bg-slate-600 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500'} text-white font-semibold rounded-xl transition-colors`}
          >
            {barrierRemoved ? 'Barrier Removed!' : 'Remove Barrier'}
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); resetSimulation(); }}
            className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-xl transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Premium CTA Button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="group mt-8 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg font-semibold rounded-2xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300 shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] flex items-center gap-2"
      >
        Discover the Secret
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      {/* Subtle Hint */}
      <p className="mt-4 text-slate-500 text-sm">
        Tap to begin your exploration
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          After mixing, particles are randomly distributed. Could they ever spontaneously separate back to their original arrangement?
        </p>
        <div className="flex justify-center gap-8 my-4">
          <div className="text-center">
            <div className="text-4xl mb-2">🔵🔵</div>
            <div className="text-blue-400 font-bold">Left</div>
            <div className="text-slate-400 text-sm">Ordered</div>
          </div>
          <div className="text-3xl text-slate-500">→ ? →</div>
          <div className="text-center">
            <div className="text-4xl mb-2">🔵🔴</div>
            <div className="text-purple-400 font-bold">Mixed</div>
            <div className="text-slate-400 text-sm">Disordered</div>
          </div>
        </div>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Yes, if we wait long enough they will separate' },
          { id: 'B', text: 'No, it\'s physically impossible' },
          { id: 'C', text: 'It\'s possible but so improbable it essentially never happens' },
          { id: 'D', text: 'Only at absolute zero temperature' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'C'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>
      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! It's <span className="text-cyan-400">statistically forbidden</span>—not physically impossible, just incredibly improbable!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all duration-300"
          >
            Explore Entropy →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Entropy Lab</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderParticleSimulation(isMobile ? 280 : 350, 200)}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-cyan-400">{calculateEntropy().toFixed(2)}</div>
            <div className="text-sm text-slate-400">Entropy S</div>
          </div>
          <div className="text-center bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-400">{calculateMicrostates()}</div>
            <div className="text-sm text-slate-400">Microstates Ω</div>
          </div>
          <div className="text-center bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-orange-400">{particles.filter(p => p.x < 100).length}</div>
            <div className="text-sm text-slate-400">Left Side</div>
          </div>
          <div className="text-center bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-400">{particles.filter(p => p.x >= 100).length}</div>
            <div className="text-sm text-slate-400">Right Side</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
        <div className="bg-slate-800/70 rounded-xl p-4">
          <label className="block text-sm text-slate-400 mb-2">Particles: {numParticles}</label>
          <input
            type="range"
            min="10"
            max="50"
            value={numParticles}
            onChange={(e) => {
              const newCount = parseInt(e.target.value);
              setNumParticles(newCount);
              setParticles(initializeParticles(newCount, !barrierRemoved));
              onGameEvent?.({ type: 'microstates_changed', data: { count: newCount } });
            }}
            className="w-full accent-purple-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              if (!barrierRemoved) {
                removeBarrier();
              }
              setIsSimulating(!isSimulating);
            }}
            className={`flex-1 p-4 rounded-xl font-semibold transition-colors ${
              isSimulating ? 'bg-red-600 hover:bg-red-500' : 'bg-purple-600 hover:bg-purple-500'
            } text-white`}
          >
            {isSimulating ? '⏹️ Pause' : '▶️ Run'}
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); resetSimulation(); }}
            className="flex-1 p-4 rounded-xl bg-slate-600 hover:bg-slate-500 text-white font-semibold transition-colors"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-purple-400 mb-3">Boltzmann's Formula</h3>
        <div className="text-center text-xl text-white font-mono mb-2">
          S = k<sub>B</sub> × ln(Ω)
        </div>
        <p className="text-sm text-slate-400">
          Entropy (S) is proportional to the logarithm of microstates (Ω).
          More ways to arrange particles = higher entropy. This is why disorder wins!
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all duration-300"
      >
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Entropy</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-3">📊 What Is Entropy?</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• A measure of disorder or randomness</li>
            <li>• The number of microscopic arrangements (microstates)</li>
            <li>• S = k<sub>B</sub> ln(Ω) — Boltzmann's formula</li>
            <li>• Higher entropy = more possible configurations</li>
            <li>• Nature tends toward maximum entropy</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">⚖️ Second Law of Thermodynamics</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Total entropy of an isolated system never decreases</li>
            <li>• ΔS<sub>universe</sub> ≥ 0 (always!)</li>
            <li>• Processes tend toward equilibrium</li>
            <li>• Explains why heat flows hot → cold</li>
            <li>• Gives time its "arrow" (direction)</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-green-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-green-400 mb-3">🎲 Statistical Interpretation</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Ordered states: few microstates (improbable)</li>
            <li>• Disordered states: many microstates (probable)</li>
            <li>• For 20 particles: ~1 million arrangements</li>
            <li>• Finding original order: 1 in 1,048,576 chance</li>
            <li>• Disorder wins by overwhelming probability!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-orange-400 mb-3">🔥 Heat and Entropy</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• ΔS = Q/T for reversible heat transfer</li>
            <li>• Adding heat increases molecular motion</li>
            <li>• More motion = more possible arrangements</li>
            <li>• Heat flows to maximize total entropy</li>
            <li>• This is why perpetual motion is impossible</li>
          </ul>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-teal-500 transition-all duration-300"
      >
        Discover a Surprising Twist →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-cyan-400 mb-6">The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Your refrigerator keeps food cold inside while the kitchen stays warm. It creates ORDER (cold, organized) from DISORDER (room temperature chaos).
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          Doesn't this violate the second law of thermodynamics?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Yes - refrigerators violate the second law' },
          { id: 'B', text: 'No - they export MORE disorder to the room than they create inside' },
          { id: 'C', text: 'They only work because electricity is "ordered energy"' },
          { id: 'D', text: 'The second law doesn\'t apply to machines' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'B'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'B'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! Refrigerators export more entropy (as heat) to the kitchen than they remove from inside!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Total entropy still increases. You can create local order by paying an entropy "tax" elsewhere!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-teal-500 transition-all duration-300"
          >
            Explore Local Order →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-cyan-400 mb-4">Local Order, Global Disorder</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-3xl mb-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">❄️ Inside Refrigerator</h3>
            <svg width="150" height="150" className="mx-auto">
              <rect width="150" height="150" fill="#0f172a" rx="10" />
              <rect x="20" y="20" width="110" height="110" fill="#1e3a5f" rx="5" />
              <text x="75" y="60" textAnchor="middle" fill="#06b6d4" fontSize="30">❄️</text>
              <text x="75" y="85" textAnchor="middle" fill="#06b6d4" fontSize="12">ΔS &lt; 0</text>
              <text x="75" y="105" textAnchor="middle" fill="#94a3b8" fontSize="10">Entropy decreases</text>
              <text x="75" y="125" textAnchor="middle" fill="#22c55e" fontSize="10">(Order increases)</text>
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-orange-400 mb-3">🔥 Kitchen (Environment)</h3>
            <svg width="150" height="150" className="mx-auto">
              <rect width="150" height="150" fill="#0f172a" rx="10" />
              <rect x="20" y="20" width="110" height="110" fill="#5f1e1e" rx="5" />
              <text x="75" y="60" textAnchor="middle" fill="#f97316" fontSize="30">🔥</text>
              <text x="75" y="85" textAnchor="middle" fill="#f97316" fontSize="12">ΔS &gt;&gt; 0</text>
              <text x="75" y="105" textAnchor="middle" fill="#94a3b8" fontSize="10">Entropy increases MORE</text>
              <text x="75" y="125" textAnchor="middle" fill="#ef4444" fontSize="10">(Disorder exported)</text>
            </svg>
          </div>
        </div>

        <div className="mt-6 bg-slate-900/50 rounded-xl p-4">
          <h4 className="text-emerald-400 font-semibold mb-2">The Key Insight:</h4>
          <p className="text-slate-300 text-sm">
            The second law says <span className="text-cyan-400">ΔS_total ≥ 0</span>, not that every part must increase.
            You can decrease entropy locally by increasing it more elsewhere!
          </p>
          <p className="text-purple-400 font-mono text-center mt-3">
            ΔS_inside + ΔS_kitchen + ΔS_power_plant &gt; 0 ✓
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-cyan-900/40 to-teal-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-cyan-400 mb-3">Life Itself Works This Way!</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• Living cells maintain incredible internal order</li>
          <li>• They achieve this by eating low-entropy food (ordered chemical bonds)</li>
          <li>• And excreting high-entropy waste (heat, CO₂, random molecules)</li>
          <li>• Total entropy of organism + environment always increases</li>
          <li>• You are a localized island of order in a sea of increasing disorder!</li>
        </ul>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-teal-500 transition-all duration-300"
      >
        Review the Discovery →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-cyan-400 mb-6">Key Discovery</h2>

      <div className="bg-gradient-to-br from-cyan-900/40 to-teal-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-cyan-400 mb-4">Order Can Be Created—At a Cost!</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            The second law doesn't forbid local decreases in entropy. It just demands payment:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-blue-400">❄️</span>
              <span><strong>Refrigerator:</strong> Creates cold inside, dumps heat outside</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">🌱</span>
              <span><strong>Plant:</strong> Captures low-entropy sunlight, releases O₂ and heat</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400">🏭</span>
              <span><strong>Factory:</strong> Creates ordered products, produces waste heat</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-400">🧠</span>
              <span><strong>Brain:</strong> Thinks ordered thoughts, dissipates 20W of heat</span>
            </li>
          </ul>
          <p className="text-emerald-400 font-medium mt-4">
            In every case: ΔS_local + ΔS_environment ≥ 0. The bill always gets paid!
          </p>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 max-w-2xl">
        <h4 className="text-purple-400 font-semibold mb-2">Free Energy: The Useful Metric</h4>
        <div className="text-center text-white font-mono text-lg mb-2">
          G = H - TS
        </div>
        <p className="text-slate-400 text-sm">
          Gibbs free energy (G) combines enthalpy and entropy into one number.
          Negative ΔG means a process is spontaneous—it will happen on its own!
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all duration-300"
      >
        Explore Real-World Applications →
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {transferApps.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index
                ? `bg-gradient-to-r ${app.color} text-white`
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {app.short}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-3xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{transferApps[activeAppTab].icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{transferApps[activeAppTab].title}</h3>
            <p className="text-purple-400 text-sm">{transferApps[activeAppTab].tagline}</p>
          </div>
        </div>

        <p className="text-slate-300 mb-4">{transferApps[activeAppTab].description}</p>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
          <h4 className="text-purple-400 font-semibold mb-2">Connection to Entropy:</h4>
          <p className="text-slate-400 text-sm">{transferApps[activeAppTab].connection}</p>
        </div>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
          <h4 className="text-cyan-400 font-semibold mb-2">How It Works:</h4>
          <p className="text-slate-400 text-sm">{transferApps[activeAppTab].howItWorks}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {transferApps[activeAppTab].stats.map((stat, i) => (
            <div key={i} className="bg-slate-900/70 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-900/50 rounded-xl p-4">
            <h4 className="text-emerald-400 font-semibold mb-2">Examples:</h4>
            <ul className="text-slate-400 text-sm space-y-1">
              {transferApps[activeAppTab].examples.map((ex, i) => (
                <li key={i}>• {ex}</li>
              ))}
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-4">
            <h4 className="text-orange-400 font-semibold mb-2">Key Organizations:</h4>
            <div className="flex flex-wrap gap-2">
              {transferApps[activeAppTab].companies.map((company, i) => (
                <span key={i} className="px-2 py-1 bg-slate-800 rounded text-slate-300 text-xs">{company}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-4">
          <h4 className="text-purple-400 font-semibold mb-2">Future Impact:</h4>
          <p className="text-slate-300 text-sm">{transferApps[activeAppTab].futureImpact}</p>
        </div>

        {!completedApps.has(activeAppTab) && (
          <button
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
            className="mt-4 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors"
          >
            ✓ Mark as Explored
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">
          {transferApps.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`}
            />
          ))}
        </div>
        <span className="text-slate-400">{completedApps.size}/{transferApps.length}</span>
      </div>

      {completedApps.size >= transferApps.length && (
        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
          className="mt-6 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-semibold rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all duration-300 shadow-lg"
        >
          Take the Knowledge Test →
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>

      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
                <p className="text-purple-400 text-sm italic">{q.scenario}</p>
              </div>
              <p className="text-white font-medium mb-3">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setShowTestResults(true);
              playSound('complete');
              onGameEvent?.({ type: 'test_complete', data: { score: calculateScore() } });
            }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="max-w-2xl w-full">
          <div className="bg-slate-800/50 rounded-2xl p-6 text-center mb-6">
            <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Score: {calculateScore()}/10
            </h3>
            <p className="text-slate-300 mb-4">
              {calculateScore() >= 7
                ? 'Excellent! You understand entropy and the second law!'
                : 'Keep studying! Review the concepts and try again.'}
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {testQuestions.map((q, qIndex) => {
              const isCorrect = q.options[testAnswers[qIndex]]?.correct;
              return (
                <div key={qIndex} className={`rounded-xl p-4 ${isCorrect ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
                  <p className="text-white font-medium mb-2">{qIndex + 1}. {q.question}</p>
                  <p className={`text-sm ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                    Your answer: {q.options[testAnswers[qIndex]]?.text}
                  </p>
                  {!isCorrect && (
                    <p className="text-emerald-400 text-sm mt-1">
                      Correct: {q.options.find(o => o.correct)?.text}
                    </p>
                  )}
                  <p className="text-slate-400 text-sm mt-2 italic">{q.explanation}</p>
                </div>
              );
            })}
          </div>

          {calculateScore() >= 7 ? (
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                goToPhase(9);
                onGameEvent?.({ type: 'mastery_achieved' });
              }}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
            >
              Claim Your Mastery Badge →
            </button>
          ) : (
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setShowTestResults(false);
                setTestAnswers(Array(10).fill(-1));
                goToPhase(3);
              }}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all duration-300"
            >
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-purple-900/50 via-blue-900/50 to-cyan-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🎲</div>
        <h1 className="text-3xl font-bold text-white mb-4">Entropy Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered entropy and the second law of thermodynamics!
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm text-slate-300">Microstates</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⚖️</div>
            <p className="text-sm text-slate-300">Second Law</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⏰</div>
            <p className="text-sm text-slate-300">Arrow of Time</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔥</div>
            <p className="text-sm text-slate-300">Free Energy</p>
          </div>
        </div>

        <div className="bg-slate-800/30 rounded-xl p-4 mb-6">
          <p className="text-purple-400 font-mono text-lg">S = k<sub>B</sub> ln(Ω)</p>
          <p className="text-slate-400 text-sm mt-2">You understand disorder!</p>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(0); }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            ↺ Explore Again
          </button>
        </div>
      </div>
    </div>
  );

  const renderPhase = () => {
    switch (phase) {
      case 0: return renderHook();
      case 1: return renderPredict();
      case 2: return renderPlay();
      case 3: return renderReview();
      case 4: return renderTwistPredict();
      case 5: return renderTwistPlay();
      case 6: return renderTwistReview();
      case 7: return renderTransfer();
      case 8: return renderTest();
      case 9: return renderMastery();
      default: return renderHook();
    }
  };

  const phaseLabels: Record<Phase, string> = {
    hook: 'Hook',
    predict: 'Predict',
    play: 'Explore',
    review: 'Review',
    twist_predict: 'Twist',
    twist_play: 'Local Order',
    twist_review: 'Discovery',
    transfer: 'Apply',
    test: 'Test',
    mastery: 'Mastery'
  };

  const phases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium Background Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950/50 via-transparent to-pink-950/50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />

      {/* Ambient Glow Circles */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      <div className="absolute top-3/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/70 border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-400`}>Entropy</span>
          <div className="flex gap-1.5 items-center">
            {phases.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p ? 'bg-purple-500 w-6' : phases.indexOf(phase) > i ? 'bg-purple-500 w-2' : 'bg-slate-600 w-2'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500`}>{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 pt-14 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default EntropyRenderer;
