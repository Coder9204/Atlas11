import React, { useState, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

interface CoupledPendulumsRendererProps {
  gamePhase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  phase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const PHASES = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'] as const;
type Phase = typeof PHASES[number];

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#cbd5e1',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  pendulum1: '#3b82f6',
  pendulum2: '#f59e0b',
  spring: '#10b981',
  energy1: '#3b82f6',
  energy2: '#f59e0b',
};

interface PendulumState {
  theta1: number;
  theta2: number;
  omega1: number;
  omega2: number;
}

const CoupledPendulumsRenderer: React.FC<CoupledPendulumsRendererProps> = ({
  gamePhase,
  phase: phaseProp,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Use gamePhase if provided, otherwise phaseProp, default to 'hook'
  const externalPhase = gamePhase || phaseProp;

  // Internal phase state for self-navigation
  const [internalPhase, setInternalPhase] = useState<Phase>('hook');

  // Use external phase if provided, otherwise internal
  const currentPhase: Phase = externalPhase && PHASES.includes(externalPhase) ? externalPhase :
                              (!externalPhase ? internalPhase : 'hook');
  const currentPhaseIndex = PHASES.indexOf(currentPhase);

  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    elementGap: isMobile ? '8px' : '12px',
  };

  // Simulation state
  const [pendulum, setPendulum] = useState<PendulumState>({
    theta1: 0.5,
    theta2: 0,
    omega1: 0,
    omega2: 0,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);

  // Game parameters
  const [coupling, setCoupling] = useState(0.5); // Spring coupling strength
  const [initialMode, setInitialMode] = useState<'one' | 'symmetric' | 'antisymmetric'>('one');

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [transferAppIndex, setTransferAppIndex] = useState(0);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [pendingAnswer, setPendingAnswer] = useState<number | null>(null);
  const [answerConfirmed, setAnswerConfirmed] = useState(false);

  // Physics constants
  const g = 9.81;
  const length = 1.0;
  const naturalFreq = Math.sqrt(g / length);

  // Physics simulation
  const updatePhysics = useCallback((dt: number, state: PendulumState): PendulumState => {
    const k = coupling * naturalFreq * naturalFreq;
    const alpha1 = -naturalFreq * naturalFreq * state.theta1 + k * (state.theta2 - state.theta1);
    const alpha2 = -naturalFreq * naturalFreq * state.theta2 + k * (state.theta1 - state.theta2);
    const damping = 0.001;
    const newOmega1 = state.omega1 * (1 - damping) + alpha1 * dt;
    const newOmega2 = state.omega2 * (1 - damping) + alpha2 * dt;
    const newTheta1 = state.theta1 + newOmega1 * dt;
    const newTheta2 = state.theta2 + newOmega2 * dt;

    return {
      theta1: newTheta1,
      theta2: newTheta2,
      omega1: newOmega1,
      omega2: newOmega2,
    };
  }, [coupling, naturalFreq]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const dt = 0.02;
    const interval = setInterval(() => {
      setPendulum(prev => updatePhysics(dt, prev));
      setTime(prev => prev + dt);
    }, 20);

    return () => clearInterval(interval);
  }, [isPlaying, updatePhysics]);

  // Reset based on initial mode
  const resetSimulation = useCallback(() => {
    setTime(0);
    setIsPlaying(false);

    if (initialMode === 'one') {
      setPendulum({ theta1: 0.5, theta2: 0, omega1: 0, omega2: 0 });
    } else if (initialMode === 'symmetric') {
      setPendulum({ theta1: 0.4, theta2: 0.4, omega1: 0, omega2: 0 });
    } else {
      setPendulum({ theta1: 0.4, theta2: -0.4, omega1: 0, omega2: 0 });
    }
  }, [initialMode]);

  useEffect(() => {
    resetSimulation();
  }, [initialMode, resetSimulation]);

  // Calculate energies
  const getEnergies = useCallback(() => {
    const m = 1;
    const KE1 = 0.5 * m * length * length * pendulum.omega1 * pendulum.omega1;
    const KE2 = 0.5 * m * length * length * pendulum.omega2 * pendulum.omega2;
    const PE1 = m * g * length * (1 - Math.cos(pendulum.theta1));
    const PE2 = m * g * length * (1 - Math.cos(pendulum.theta2));
    const k = coupling * naturalFreq * naturalFreq * m * length * length;
    const springPE = 0.5 * k * Math.pow(pendulum.theta2 - pendulum.theta1, 2);
    const total1 = KE1 + PE1;
    const total2 = KE2 + PE2;

    return { total1, total2, spring: springPE, total: total1 + total2 + springPE };
  }, [pendulum, coupling, naturalFreq, g, length]);

  // Navigation functions
  const goToPhase = (phase: Phase) => {
    if (!externalPhase) {
      setInternalPhase(phase);
    }
  };

  const goNext = () => {
    if (externalPhase && onPhaseComplete) {
      onPhaseComplete();
    } else if (currentPhaseIndex < PHASES.length - 1) {
      setInternalPhase(PHASES[currentPhaseIndex + 1]);
    }
  };

  const goBack = () => {
    if (currentPhaseIndex > 0 && !externalPhase) {
      setInternalPhase(PHASES[currentPhaseIndex - 1]);
    }
  };

  const predictions = [
    { id: 'stays', label: 'First pendulum keeps swinging, second stays still' },
    { id: 'transfer', label: 'Energy gradually transfers to second pendulum' },
    { id: 'chaos', label: 'Both pendulums swing chaotically' },
    { id: 'sync', label: 'Both immediately swing together in sync' },
  ];

  const twistPredictions = [
    { id: 'faster', label: 'Energy transfers faster between pendulums' },
    { id: 'slower', label: 'Energy transfers slower between pendulums' },
    { id: 'same', label: 'Transfer rate stays the same' },
    { id: 'none', label: 'Energy stops transferring completely' },
  ];

  const transferApplications = [
    {
      title: 'Coupled Power Lines - Pacific Gas and Electric',
      description: 'Pacific Gas and Electric Company manages over 18,500 miles of power lines across California. Parallel high-voltage transmission lines (typically 500kV) can oscillate together when wind excites one line at speeds above 15 mph. Engineers from General Electric and Siemens have developed spacer dampers that reduce oscillation amplitude by 85%.',
      question: 'Why do engineers add spacer dampers to parallel power lines?',
      answer: 'Spacer dampers control the coupling between lines, preventing large-amplitude synchronized oscillations that could cause galloping or conductor clash. This technology saves utilities approximately $50 million annually in maintenance costs.',
    },
    {
      title: 'Molecular Vibrations - NASA Climate Research',
      description: 'NASA\'s Jet Propulsion Laboratory uses coupled oscillator theory to study CO2 in Earth\'s atmosphere. In CO2 molecules, carbon-oxygen bonds vibrate at frequencies around 2,349 cm^-1 (asymmetric stretch). The coupling between atomic oscillators determines that CO2 absorbs infrared radiation at wavelengths of 4.26 micrometers and 15 micrometers.',
      question: 'How does coupled oscillator theory explain infrared absorption in CO2?',
      answer: 'The symmetric and antisymmetric stretching modes absorb different IR frequencies. The coupling determines which modes are IR-active, making CO2 responsible for approximately 20% of Earth\'s greenhouse warming effect.',
    },
    {
      title: 'Acoustic Beats - Steinway Piano Manufacturing',
      description: 'Steinway and Sons piano technicians use beat frequencies to tune instruments with 99.5% accuracy. When two piano strings are slightly detuned (e.g., 440 Hz vs 442 Hz), they produce audible beats at 2 Hz. Professional piano tuners at Yamaha and Baldwin adjust strings until beats become imperceptible (less than 0.5 Hz difference).',
      question: 'Why do beat frequencies equal the difference between two frequencies?',
      answer: 'The coupled air creates interference. When waves align (constructive), sound is loud; when opposite (destructive), it\'s quiet. This cycles at the frequency difference, allowing tuners to achieve precision within 0.1 Hz.',
    },
    {
      title: 'Wilberforce Pendulum - MIT Physics Laboratory',
      description: 'The Massachusetts Institute of Technology demonstrates coupled oscillations using Wilberforce pendulums in Physics 8.01. A 500g brass mass on a spring can both bounce (at approximately 1.2 Hz) and twist (also near 1.2 Hz). When these frequencies match within 3%, energy transfers completely between modes in about 10 seconds.',
      question: 'What determines whether a Wilberforce pendulum shows energy exchange?',
      answer: 'Energy transfer requires the bounce and twist frequencies to be nearly equal (resonance within 5%). The spring geometry couples these modes, causing periodic exchange with a beat period of T = 2*pi / |omega_1 - omega_2|.',
    },
  ];

  const testQuestions = [
    {
      question: 'When one of two identical coupled pendulums is displaced and released, what happens to the energy?',
      options: [
        { text: 'Stays in the first pendulum', correct: false },
        { text: 'Gradually transfers back and forth between pendulums', correct: true },
        { text: 'Immediately splits equally between both', correct: false },
        { text: 'Dissipates into the coupling spring', correct: false },
      ],
    },
    {
      question: 'What is the "beat frequency" in coupled pendulums?',
      options: [
        { text: 'The average frequency of both pendulums', correct: false },
        { text: 'The difference between normal mode frequencies', correct: true },
        { text: 'The frequency of the coupling spring', correct: false },
        { text: 'The natural frequency of a single pendulum', correct: false },
      ],
    },
    {
      question: 'What are "normal modes" in coupled oscillators?',
      options: [
        { text: 'The most common ways pendulums swing', correct: false },
        { text: 'Patterns where all parts oscillate at the same frequency', correct: true },
        { text: 'The modes that require the least energy', correct: false },
        { text: 'Patterns that only occur when damping is zero', correct: false },
      ],
    },
    {
      question: 'In the symmetric (in-phase) normal mode of coupled pendulums, how does the spring behave?',
      options: [
        { text: 'Stretches and compresses maximally', correct: false },
        { text: 'Remains at its natural length (no stretching)', correct: true },
        { text: 'Oscillates at double the pendulum frequency', correct: false },
        { text: 'Stores all the system\'s energy', correct: false },
      ],
    },
    {
      question: 'Why does increasing coupling strength affect energy transfer rate?',
      options: [
        { text: 'Stronger spring provides more resistance to motion', correct: false },
        { text: 'Larger frequency difference between normal modes means faster beats', correct: true },
        { text: 'More coupling reduces the total system energy', correct: false },
        { text: 'Coupling strength doesn\'t affect transfer rate', correct: false },
      ],
    },
    {
      question: 'If you start both pendulums displaced equally in the same direction, what happens?',
      options: [
        { text: 'They immediately begin energy exchange', correct: false },
        { text: 'They continue swinging in phase forever (pure normal mode)', correct: true },
        { text: 'The coupling causes them to slow down quickly', correct: false },
        { text: 'They swing out of phase due to spring coupling', correct: false },
      ],
    },
    {
      question: 'What causes the energy to transfer back from the second pendulum to the first?',
      options: [
        { text: 'Gravity pulls energy back to the first pendulum', correct: false },
        { text: 'The phase relationship reverses as beats continue', correct: true },
        { text: 'The spring recoils after maximum stretch', correct: false },
        { text: 'Energy doesn\'t actually transfer back', correct: false },
      ],
    },
    {
      question: 'The antisymmetric (out-of-phase) mode has a higher frequency than symmetric mode because:',
      options: [
        { text: 'The spring adds restoring force when pendulums oppose', correct: true },
        { text: 'Opposite motion creates destructive interference', correct: false },
        { text: 'The effective mass decreases in antisymmetric motion', correct: false },
        { text: 'Air resistance is lower for opposite motion', correct: false },
      ],
    },
    {
      question: 'Two pendulum clocks on the same shelf can synchronize over time. This is due to:',
      options: [
        { text: 'Identical manufacturing tolerances', correct: false },
        { text: 'Weak coupling through the shelf allowing energy exchange', correct: true },
        { text: 'Temperature equilibration of the room', correct: false },
        { text: 'Electromagnetic interactions between clock mechanisms', correct: false },
      ],
    },
    {
      question: 'What determines how long it takes for complete energy transfer between coupled pendulums?',
      options: [
        { text: 'The total initial energy of the system', correct: false },
        { text: 'The pendulum length', correct: false },
        { text: 'The inverse of the coupling strength (weaker = longer)', correct: true },
        { text: 'The mass of the pendulum bobs', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    if (!answerConfirmed) {
      setPendingAnswer(optionIndex);
    }
  };

  const confirmAnswer = () => {
    if (pendingAnswer !== null) {
      const newAnswers = [...testAnswers];
      newAnswers[currentTestQuestion] = pendingAnswer;
      setTestAnswers(newAnswers);
      setAnswerConfirmed(true);
    }
  };

  const goToNextQuestion = () => {
    if (currentTestQuestion < testQuestions.length - 1) {
      setCurrentTestQuestion(currentTestQuestion + 1);
      setPendingAnswer(null);
      setAnswerConfirmed(false);
    }
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  // Store motion trail history
  const [trailHistory, setTrailHistory] = useState<Array<{x1: number, y1: number, x2: number, y2: number}>>([]);

  // Update trail history when pendulum moves
  useEffect(() => {
    if (isPlaying) {
      const width = 400;
      const pivotY = 60;
      const pendulumLength = 150;
      const x1 = width * 0.3 + pendulumLength * Math.sin(pendulum.theta1);
      const y1 = pivotY + pendulumLength * Math.cos(pendulum.theta1);
      const x2 = width * 0.7 + pendulumLength * Math.sin(pendulum.theta2);
      const y2 = pivotY + pendulumLength * Math.cos(pendulum.theta2);

      setTrailHistory(prev => {
        const newHistory = [...prev, {x1, y1, x2, y2}];
        return newHistory.slice(-20);
      });
    }
  }, [pendulum, isPlaying]);

  // Clear trail on reset
  useEffect(() => {
    if (!isPlaying && time === 0) {
      setTrailHistory([]);
    }
  }, [isPlaying, time]);

  // Navigation bar component
  const renderNavigationBar = () => {
    const canGoBack = currentPhaseIndex > 0;
    const progressPercent = ((currentPhaseIndex + 1) / PHASES.length) * 100;
    // Disable Next during test phase unless test is submitted
    const isTestPhase = currentPhase === 'test';
    const nextDisabled = isTestPhase && !testSubmitted;

    return (
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: colors.bgDark,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '8px 16px',
      }}>
        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            height: '4px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '2px',
            marginBottom: '8px',
            overflow: 'hidden',
          }}
        >
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: colors.accent,
            transition: 'width 0.3s ease',
          }} />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {/* Back button */}
          <button
            onClick={goBack}
            disabled={!canGoBack}
            aria-label="Back"
            style={{
              padding: '8px 16px',
              minHeight: '44px',
              minWidth: '44px',
              borderRadius: '8px',
              border: `1px solid ${canGoBack ? colors.textSecondary : 'rgba(255,255,255,0.2)'}`,
              background: 'transparent',
              color: canGoBack ? colors.textSecondary : colors.textMuted,
              cursor: canGoBack ? 'pointer' : 'not-allowed',
              fontSize: typo.body,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Back
          </button>

          {/* Navigation dots */}
          <div style={{
            display: 'flex',
            gap: '6px',
            alignItems: 'center',
          }}>
            {PHASES.map((phase, index) => (
              <button
                key={phase}
                onClick={() => goToPhase(phase)}
                aria-label={phase}
                title={phase}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  border: 'none',
                  background: index === currentPhaseIndex
                    ? colors.accent
                    : index < currentPhaseIndex
                      ? colors.success
                      : 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>

          {/* Next button */}
          <button
            onClick={nextDisabled ? undefined : goNext}
            disabled={nextDisabled}
            aria-label="Next"
            style={{
              padding: '8px 16px',
              minHeight: '44px',
              minWidth: '44px',
              borderRadius: '8px',
              border: 'none',
              background: nextDisabled ? 'rgba(139, 92, 246, 0.4)' : colors.accent,
              color: 'white',
              cursor: nextDisabled ? 'not-allowed' : 'pointer',
              opacity: nextDisabled ? 0.4 : 1,
              fontSize: typo.body,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Next
          </button>
        </div>
      </nav>
    );
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 300;
    const pivotY = 50;
    const pendulumLength = 140;
    const bobRadius = 18;

    // Calculate bob positions
    const x1 = width * 0.3 + pendulumLength * Math.sin(pendulum.theta1);
    const y1 = pivotY + pendulumLength * Math.cos(pendulum.theta1);
    const x2 = width * 0.7 + pendulumLength * Math.sin(pendulum.theta2);
    const y2 = pivotY + pendulumLength * Math.cos(pendulum.theta2);

    // Calculate coupling spring position
    const springY = pivotY + pendulumLength * 0.4;
    const spring1X = width * 0.3 + pendulumLength * 0.4 * Math.sin(pendulum.theta1);
    const spring2X = width * 0.7 + pendulumLength * 0.4 * Math.sin(pendulum.theta2);

    // Spring stretch for color intensity
    const springStretch = Math.abs(spring2X - spring1X - (width * 0.4));
    const stretchIntensity = Math.min(springStretch / 30, 1);

    // Generate spring path
    const generateSpringPath = () => {
      const numCoils = 12;
      const amplitude = 26 + stretchIntensity * 6;
      const springLength = spring2X - spring1X;
      const coilWidth = springLength / numCoils;

      let path = `M ${spring1X} ${springY}`;
      for (let i = 0; i < numCoils; i++) {
        const x = spring1X + coilWidth * (i + 0.5);
        const yOffset = i % 2 === 0 ? amplitude : -amplitude;
        path += ` Q ${spring1X + coilWidth * i + coilWidth * 0.25} ${springY + yOffset * 1.5}, ${x} ${springY + yOffset}`;
      }
      path += ` L ${spring2X} ${springY}`;
      return path;
    };

    // Get energies for display
    const energies = getEnergies();
    const maxEnergy = energies.total || 1;

    // Energy transfer visualization
    const energyTransferDirection = energies.total1 > energies.total2 ? 1 : -1;
    const transferIntensity = Math.abs(energies.total1 - energies.total2) / maxEnergy;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: typo.elementGap }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            <linearGradient id="coupBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            <linearGradient id="coupBeamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="20%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="80%" stopColor="#475569" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>

            <radialGradient id="coupPivotGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="40%" stopColor="#64748b" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </radialGradient>

            <linearGradient id="coupRodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="25%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="75%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            <radialGradient id="coupBob1Grad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="30%" stopColor="#3b82f6" />
              <stop offset="60%" stopColor="#2563eb" />
              <stop offset="85%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </radialGradient>

            <radialGradient id="coupBob2Grad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="30%" stopColor="#fbbf24" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="85%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </radialGradient>

            <linearGradient id="coupSpringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="20%" stopColor="#10b981" />
              <stop offset="40%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#6ee7b7" />
              <stop offset="60%" stopColor="#34d399" />
              <stop offset="80%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            <linearGradient id="coupSpringStressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="20%" stopColor="#ef4444" />
              <stop offset="40%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#fca5a5" />
              <stop offset="60%" stopColor="#f87171" />
              <stop offset="80%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            <linearGradient id="coupEnergy1Grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="30%" stopColor="#2563eb" />
              <stop offset="60%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>

            <linearGradient id="coupEnergy2Grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="30%" stopColor="#d97706" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            <radialGradient id="coupTransferGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="1" />
              <stop offset="40%" stopColor="#8b5cf6" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#7c3aed" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6d28d9" stopOpacity="0" />
            </radialGradient>

            <filter id="coupGlow1" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#3b82f6" floodOpacity="0.6" />
              <feComposite in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="coupGlow2" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#f59e0b" floodOpacity="0.6" />
              <feComposite in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="coupSpringGlow" x="-50%" y="-100%" width="200%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="coupTransferGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <g id="background-layer">
            <rect width={width} height={height} fill="url(#coupBgGrad)" />

            {/* Grid lines for visual reference */}
            {[0.25, 0.5, 0.75].map(frac => (
              <line
                key={`hgrid-${frac}`}
                x1={0}
                y1={height * frac}
                x2={width}
                y2={height * frac}
                stroke="#1e293b"
                strokeWidth="0.5"
                strokeDasharray="4 4"
                opacity={0.4}
              />
            ))}
            {[0.25, 0.5, 0.75].map(frac => (
              <line
                key={`vgrid-${frac}`}
                x1={width * frac}
                y1={0}
                x2={width * frac}
                y2={height}
                stroke="#1e293b"
                strokeWidth="0.5"
                strokeDasharray="4 4"
                opacity={0.4}
              />
            ))}
          </g>

          {/* Structure layer */}
          <g id="structure-layer">
            {/* Support beam */}
            <rect x={width * 0.15} y={pivotY - 12} width={width * 0.7} height={14} fill="url(#coupBeamGrad)" rx={4} />
            <rect x={width * 0.15} y={pivotY - 12} width={width * 0.7} height={3} fill="#94a3b8" fillOpacity={0.3} rx={2} />

            {/* Mounting brackets */}
            <rect x={width * 0.15 - 5} y={pivotY - 16} width={10} height={22} fill="url(#coupBeamGrad)" rx={2} />
            <rect x={width * 0.85 - 5} y={pivotY - 16} width={10} height={22} fill="url(#coupBeamGrad)" rx={2} />

            {/* Pivot points */}
            <circle cx={width * 0.3} cy={pivotY} r={8} fill="url(#coupPivotGrad)" />
            <circle cx={width * 0.3} cy={pivotY} r={4} fill="#1e293b" />
            <circle cx={width * 0.7} cy={pivotY} r={8} fill="url(#coupPivotGrad)" />
            <circle cx={width * 0.7} cy={pivotY} r={4} fill="#1e293b" />
          </g>

          {/* Motion trails for pendulum 1 */}
          {trailHistory.length > 1 && trailHistory.slice(0, -1).map((pos, i) => {
            const nextPos = trailHistory[i + 1];
            const opacity = (i / trailHistory.length) * 0.5;
            return (
              <line
                key={`trail1-${i}`}
                x1={pos.x1}
                y1={pos.y1}
                x2={nextPos.x1}
                y2={nextPos.y1}
                stroke="#3b82f6"
                strokeWidth={2}
                strokeOpacity={opacity}
                strokeLinecap="round"
              />
            );
          })}

          {/* Motion trails for pendulum 2 */}
          {trailHistory.length > 1 && trailHistory.slice(0, -1).map((pos, i) => {
            const nextPos = trailHistory[i + 1];
            const opacity = (i / trailHistory.length) * 0.5;
            return (
              <line
                key={`trail2-${i}`}
                x1={pos.x2}
                y1={pos.y2}
                x2={nextPos.x2}
                y2={nextPos.y2}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeOpacity={opacity}
                strokeLinecap="round"
              />
            );
          })}

          {/* Energy exchange curve - shows predicted beat envelope based on coupling */}
          {(() => {
            const curvePoints = 30;
            const beatFreq = coupling * naturalFreq * 0.5;
            const curveBaseline = height * 0.5;
            const curveAmplitude = height * 0.18;
            let pathD = '';
            for (let i = 0; i < curvePoints; i++) {
              const t = (i / (curvePoints - 1)) * Math.PI * 4;
              const px = width * 0.1 + (width * 0.8) * (i / (curvePoints - 1));
              const py = curveBaseline + curveAmplitude * Math.sin(t * beatFreq);
              pathD += (i === 0 ? 'M ' : ' L ') + px.toFixed(1) + ' ' + py.toFixed(1);
            }
            return (
              <path
                d={pathD}
                fill="none"
                stroke="rgba(139,92,246,0.5)"
                strokeWidth={1.5}
                strokeDasharray="3 2"
              />
            );
          })()}

          {/* Interactive marker showing current coupling position on energy curve */}
          {(() => {
            const markerFrac = (coupling - 0.1) / (2 - 0.1);
            const markerX = width * 0.1 + width * 0.8 * markerFrac;
            const beatFreq = coupling * naturalFreq * 0.5;
            const t = markerFrac * Math.PI * 4;
            const markerY = height * 0.5 + height * 0.18 * Math.sin(t * beatFreq);
            return (
              <circle
                cx={markerX}
                cy={markerY}
                r={7}
                fill={colors.accent}
                stroke="#ffffff"
                strokeWidth={2}
                filter="url(#coupGlow1)"
              />
            );
          })()}

          {/* Coupling spring */}
          <path
            d={generateSpringPath()}
            fill="none"
            stroke={stretchIntensity > 0.5 ? `url(#coupSpringStressGrad)` : `url(#coupSpringGrad)`}
            strokeWidth={3}
            strokeLinecap="round"
            filter="url(#coupSpringGlow)"
          />

          {/* Spring label */}
          <text x={(spring1X + spring2X) / 2} y={springY - 12} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">
            Spring
          </text>

          {/* Spring attachment points */}
          <circle cx={spring1X} cy={springY} r={4} fill="url(#coupPivotGrad)" />
          <circle cx={spring2X} cy={springY} r={4} fill="url(#coupPivotGrad)" />

          {/* Energy transfer visualization */}
          {isPlaying && transferIntensity > 0.1 && (
            <>
              {[0, 1, 2].map((i) => {
                const progress = ((time * 3 + i * 0.33) % 1);
                const particleX = energyTransferDirection > 0
                  ? spring1X + (spring2X - spring1X) * progress
                  : spring2X - (spring2X - spring1X) * progress;
                return (
                  <circle
                    key={`transfer-${i}`}
                    cx={particleX}
                    cy={springY + Math.sin(progress * Math.PI * 4) * 4}
                    r={3 + transferIntensity * 2}
                    fill="url(#coupTransferGrad)"
                    filter="url(#coupTransferGlow)"
                    opacity={transferIntensity * 0.8}
                  />
                );
              })}
            </>
          )}

          {/* Pendulums layer */}
          <g id="pendulums-layer">
            {/* Pendulum 1 rod */}
            <line
              x1={width * 0.3}
              y1={pivotY}
              x2={x1}
              y2={y1}
              stroke="url(#coupRodGrad)"
              strokeWidth={5}
              strokeLinecap="round"
            />

            {/* Pendulum 2 rod */}
            <line
              x1={width * 0.7}
              y1={pivotY}
              x2={x2}
              y2={y2}
              stroke="url(#coupRodGrad)"
              strokeWidth={5}
              strokeLinecap="round"
            />

            {/* Pendulum 1 bob */}
            <circle
              cx={x1}
              cy={y1}
              r={bobRadius}
              fill="url(#coupBob1Grad)"
              filter="url(#coupGlow1)"
            />
            <ellipse
              cx={x1 - bobRadius * 0.3}
              cy={y1 - bobRadius * 0.3}
              rx={bobRadius * 0.3}
              ry={bobRadius * 0.2}
              fill="white"
              fillOpacity={0.3}
            />

            {/* Pendulum 2 bob */}
            <circle
              cx={x2}
              cy={y2}
              r={bobRadius}
              fill="url(#coupBob2Grad)"
              filter="url(#coupGlow2)"
            />
            <ellipse
              cx={x2 - bobRadius * 0.3}
              cy={y2 - bobRadius * 0.3}
              rx={bobRadius * 0.3}
              ry={bobRadius * 0.2}
              fill="white"
              fillOpacity={0.3}
            />
          </g>

          {/* Direct labels on pendulums */}
          <text x={x1} y={y1 + bobRadius + 16} textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="bold">
            Pendulum 1
          </text>
          <text x={x2} y={y2 + bobRadius + 16} textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="bold">
            Pendulum 2
          </text>

          {/* Energy bars */}
          <rect x={width * 0.1} y={height - 35} width={width * 0.35} height={10} fill="rgba(255,255,255,0.08)" rx={5} />
          <rect x={width * 0.1} y={height - 35} width={Math.max(0, width * 0.35 * (energies.total1 / maxEnergy))} height={10} fill="url(#coupEnergy1Grad)" rx={5} />
          <text x={width * 0.1} y={height - 10} fill="#e2e8f0" fontSize="11">Energy 1</text>

          <rect x={width * 0.55} y={height - 35} width={width * 0.35} height={10} fill="rgba(255,255,255,0.08)" rx={5} />
          <rect x={width * 0.55} y={height - 35} width={Math.max(0, width * 0.35 * (energies.total2 / maxEnergy))} height={10} fill="url(#coupEnergy2Grad)" rx={5} />
          <text x={width * 0.55} y={height - 10} fill="#e2e8f0" fontSize="11">Energy 2</text>

          {/* Legend panel */}
          <rect x={10} y={10} width={90} height={55} fill="rgba(0,0,0,0.5)" rx={4} />
          <text x={20} y={25} fill="#e2e8f0" fontSize="11" fontWeight="bold">Legend</text>
          <circle cx={25} cy={38} r={5} fill="#3b82f6" />
          <text x={35} y={42} fill="#e2e8f0" fontSize="11">Pendulum 1</text>
          <circle cx={25} cy={53} r={5} fill="#f59e0b" />
          <text x={35} y={57} fill="#e2e8f0" fontSize="11">Pendulum 2</text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: isPlaying
                  ? `linear-gradient(135deg, ${colors.error} 0%, #dc2626 100%)`
                  : `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
                boxShadow: isPlaying
                  ? `0 4px 20px ${colors.error}40`
                  : `0 4px 20px ${colors.success}40`,
              }}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={resetSimulation}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Coupling Strength: {coupling.toFixed(2)}
        </label>
        <input
          type="range"
          min="0.1"
          max="2"
          step="0.1"
          value={coupling}
          onChange={(e) => setCoupling(parseFloat(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent, background: 'rgba(139, 92, 246, 0.3)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted, marginTop: '2px' }}>
          <span>0.1 (Weak)</span>
          <span>2 (Strong)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Initial Condition:
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { mode: 'one' as const, label: 'One Displaced' },
            { mode: 'symmetric' as const, label: 'In-Phase' },
            { mode: 'antisymmetric' as const, label: 'Anti-Phase' },
          ].map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => setInitialMode(mode)}
              style={{
                padding: '8px 16px',
                minHeight: '44px',
                borderRadius: '6px',
                border: 'none',
                background: initialMode === mode ? colors.accent : 'rgba(255,255,255,0.1)',
                color: initialMode === mode ? 'white' : colors.textSecondary,
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', marginBottom: '4px' }}>
          Time: {time.toFixed(1)}s
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Beat Period: ~{(2 * Math.PI / (coupling * naturalFreq)).toFixed(1)}s
        </div>
      </div>

      {/* Comparison display: current vs reference values */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ background: 'rgba(59,130,246,0.15)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ color: colors.textMuted, fontSize: '11px' }}>Current coupling factor</div>
          <div style={{ color: colors.pendulum1, fontSize: '18px', fontWeight: 'bold' }}>{coupling.toFixed(1)}x</div>
        </div>
        <div style={{ background: 'rgba(245,158,11,0.15)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ color: colors.textMuted, fontSize: '11px' }}>Reference baseline</div>
          <div style={{ color: colors.pendulum2, fontSize: '18px', fontWeight: 'bold' }}>1.0x</div>
        </div>
      </div>
    </div>
  );

  // HOOK PHASE
  if (currentPhase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavigationBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              The Sympathetic Swings
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Two pendulums. One connection. A mysterious dance of energy.
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                In 1665, Christiaan Huygens noticed something bizarre: two pendulum clocks on the same
                shelf would synchronize their swings over time, even when started differently.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                He called it "an odd kind of sympathy" - but what causes this ghostly connection?
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try displacing just one pendulum and watch what happens to the other...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (currentPhase === 'predict') {
    const answeredCount = prediction ? 1 : 0;
    const totalQuestions = 1;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavigationBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
          {/* Progress indicator */}
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Progress: {answeredCount} of {totalQuestions} predictions made
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Two identical pendulums connected by a spring. The left pendulum (blue) is
              pulled to the side. The right pendulum (orange) starts at rest. The energy
              bars show how much energy each pendulum has.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              When I release the left pendulum, what will happen?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PLAY PHASE
  if (currentPhase === 'play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavigationBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Coupled Oscillations</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch energy flow between pendulums through the spring coupling
            </p>
          </div>

          {/* Key Physics Terms Definition */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            margin: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.pendulum1}`,
          }}>
            <h4 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: '14px' }}>Key Physics Terms:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
              <strong>Coupling strength</strong> is defined as the force constant of the spring connecting two oscillators.
              <strong> Beat frequency</strong> is the measure of how fast energy transfers back and forth, calculated as f_beat = |f_2 - f_1|.
              <strong> Normal modes</strong> refers to special motion patterns where all parts oscillate at the same frequency.
            </p>
          </div>

          {/* Real-world Relevance */}
          <div style={{
            background: 'rgba(139, 92, 246, 0.15)',
            margin: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <h4 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: '14px' }}>Why This Matters:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
              This is important because engineers use coupled oscillator theory to design earthquake-resistant buildings,
              noise-canceling technology, and radio tuning circuits. Understanding how energy transfers between coupled
              systems is useful in applications from bridge construction to quantum computing.
            </p>
          </div>

          {/* Observation guidance */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            margin: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.success}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              Observe how energy transfers between pendulums. Watch the energy bars showing how when you increase coupling strength,
              energy transfers faster because higher coupling causes larger frequency separation between normal modes.
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}


          <div style={{


            display: 'flex',


            flexDirection: isMobile ? 'column' : 'row',


            gap: isMobile ? '12px' : '20px',


            width: '100%',


            alignItems: isMobile ? 'center' : 'flex-start',


          }}>


            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


              {renderVisualization(true)}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Start with "One Displaced" - watch energy transfer</li>
              <li>Try "In-Phase" mode - both swing together</li>
              <li>Try "Anti-Phase" mode - they swing opposite</li>
              <li>Increase coupling - energy transfers faster!</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // REVIEW PHASE
  if (currentPhase === 'review') {
    const wasCorrect = prediction === 'transfer';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavigationBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              As you predicted, energy gradually transfers back and forth between the two pendulums!
            </p>
          </div>

          {/* Visual diagram for review */}
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Coupling</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Energy Exchange:</strong> The spring
                connecting the pendulums acts as an energy transfer mechanism. When one pendulum
                swings, it stretches the spring, which pulls on the other pendulum.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Beat Phenomenon:</strong> The energy
                oscillates back and forth at the "beat frequency" - the difference between the two
                natural frequencies of the coupled system.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Normal Modes:</strong> There are two
                special patterns: symmetric (in-phase) where both swing together, and antisymmetric
                (anti-phase) where they swing opposite. Each has its own frequency.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Key Formula:</strong> The beat frequency
                equals the difference between normal mode frequencies: f_beat = |f_2 - f_1|
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (currentPhase === 'twist_predict') {
    const answeredCount = twistPrediction ? 1 : 0;
    const totalQuestions = 1;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavigationBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if we make the spring stiffer (stronger coupling)?
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '8px' }}>
              Progress: {answeredCount} of {totalQuestions} predictions made
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Same two pendulums, but now imagine we replace the spring with a much stiffer one.
              This creates stronger coupling between the pendulums.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              With a stiffer coupling spring, what happens to the energy transfer?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (currentPhase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavigationBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test the Coupling Strength</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust the coupling and observe how it affects energy transfer rate
            </p>
          </div>

          {/* Observation guidance */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            margin: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              Observe: Increase the coupling slider and watch the beat period change. Notice how stronger coupling causes faster energy exchange.
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}


          <div style={{


            display: 'flex',


            flexDirection: isMobile ? 'column' : 'row',


            gap: isMobile ? '12px' : '20px',


            width: '100%',


            alignItems: isMobile ? 'center' : 'flex-start',


          }}>


            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


              {renderVisualization(true)}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch the beat period change as you adjust coupling strength. Stronger coupling
              means the two normal mode frequencies are more different, so beats happen faster!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (currentPhase === 'twist_review') {
    const wasCorrect = twistPrediction === 'faster';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavigationBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              As you observed, stronger coupling causes faster energy transfer between pendulums!
            </p>
          </div>

          {/* Visual diagram for twist review */}
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Mathematics of Beats</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Normal Mode Frequencies:</strong>
              </p>
              <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
                <li>Symmetric mode: omega_1 = omega_0 (natural frequency)</li>
                <li>Antisymmetric mode: omega_2 = sqrt(omega_0^2 + 2k) where k is coupling</li>
              </ul>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Beat Frequency Formula:</strong> The energy
                transfer rate equals |omega_2 - omega_1|. Stronger coupling increases omega_2, making this
                difference larger and beats faster. The relationship is proportional to sqrt(k).
              </p>
              <p>
                This is why Huygens' clocks synchronized - weak coupling through the shelf
                meant very slow energy exchange, eventually locking them in phase.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TRANSFER PHASE
  if (currentPhase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Coupled Pendulums"
        applications={transferApplications}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (currentPhase === 'transfer') {
    const currentApp = transferApplications[transferAppIndex];
    const isCurrentCompleted = transferCompleted.has(transferAppIndex);

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavigationBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Coupled oscillators are everywhere in nature and engineering. From the synchronization of fireflies to the design of modern bridges,
              understanding how energy transfers between connected systems has revolutionized technology and our understanding of nature.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
              Application {transferAppIndex + 1} of {transferApplications.length} ({transferCompleted.size} completed)
            </p>
          </div>

          {/* Additional context about real-world impact */}
          <div style={{
            background: 'rgba(139, 92, 246, 0.1)',
            margin: '0 16px 16px 16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
              The physics you have learned about coupled pendulums applies to systems ranging from molecules (measured in nanometers) to
              power grids spanning thousands of kilometers. Major companies like General Electric, Siemens, and NASA use these principles
              in their research and product development. These applications demonstrate how fundamental physics principles scale across
              many orders of magnitude.
            </p>
          </div>

          {/* Current application card */}
          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            border: isCurrentCompleted ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px' }}>{currentApp.title}</h3>
              {isCurrentCompleted && (
                <span style={{ color: colors.success, fontSize: '18px' }}>Completed</span>
              )}
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '16px', lineHeight: 1.6 }}>
              {currentApp.description}
            </p>
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '12px',
            }}>
              <p style={{ color: colors.accent, fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                {currentApp.question}
              </p>
            </div>
            {!isCurrentCompleted ? (
              <button
                onClick={() => setTransferCompleted(new Set([...transferCompleted, transferAppIndex]))}
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.accent}`,
                  background: 'transparent',
                  color: colors.accent,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Reveal Answer
              </button>
            ) : (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '12px',
                borderRadius: '8px',
                borderLeft: `3px solid ${colors.success}`,
              }}>
                <p style={{ color: colors.textPrimary, fontSize: '14px', lineHeight: 1.5 }}>{currentApp.answer}</p>
              </div>
            )}
          </div>

          {/* Navigation between applications */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', gap: '16px' }}>
            <button
              onClick={() => setTransferAppIndex(Math.max(0, transferAppIndex - 1))}
              disabled={transferAppIndex === 0}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: `1px solid ${transferAppIndex === 0 ? 'rgba(255,255,255,0.2)' : colors.textSecondary}`,
                background: 'transparent',
                color: transferAppIndex === 0 ? colors.textMuted : colors.textSecondary,
                cursor: transferAppIndex === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              Previous App
            </button>
            {transferAppIndex < transferApplications.length - 1 ? (
              <button
                onClick={() => setTransferAppIndex(transferAppIndex + 1)}
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Next App
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={transferCompleted.size < transferApplications.length}
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: 'none',
                  background: transferCompleted.size >= transferApplications.length ? colors.success : 'rgba(255,255,255,0.2)',
                  color: transferCompleted.size >= transferApplications.length ? 'white' : colors.textMuted,
                  cursor: transferCompleted.size >= transferApplications.length ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Got It - Continue
              </button>
            )}
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px' }}>
            {transferApplications.map((_, index) => (
              <button
                key={index}
                onClick={() => setTransferAppIndex(index)}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  border: 'none',
                  background: transferCompleted.has(index)
                    ? colors.success
                    : index === transferAppIndex
                      ? colors.accent
                      : 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // TEST PHASE
  if (currentPhase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderNavigationBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent! You Scored:' : 'Keep Learning! You Scored:'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>
                {testScore} / 10
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered coupled oscillations!' : 'Review the material and try again.'}
              </p>
            </div>

            {/* Navigation buttons after quiz completion */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', padding: '16px' }}>
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers(new Array(10).fill(null));
                  setCurrentTestQuestion(0);
                  setPendingAnswer(null);
                  setAnswerConfirmed(false);
                  setTestScore(0);
                }}
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.accent}`,
                  background: 'transparent',
                  color: colors.accent,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Try Again
              </button>
              <button
                onClick={goNext}
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.success,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Continue
              </button>
            </div>

            {/* Answer review with checkmarks/X marks */}
            <h3 style={{ color: colors.textPrimary, padding: '0 16px', marginTop: '16px' }}>Answer Review:</h3>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              const optionLabels = ['A', 'B', 'C', 'D'];

              return (
                <div
                  key={qIndex}
                  style={{
                    background: colors.bgCard,
                    margin: '16px',
                    padding: '16px',
                    borderRadius: '12px',
                    borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                    <span style={{
                      color: isCorrect ? colors.success : colors.error,
                      fontSize: '18px',
                      fontWeight: 'bold',
                    }}>
                      {isCorrect ? '\u2713' : '\u2717'}
                    </span>
                    <p style={{ color: colors.textPrimary, fontWeight: 'bold', margin: 0 }}>
                      Q{qIndex + 1}: {q.question}
                    </p>
                  </div>
                  <p style={{ color: colors.textSecondary, fontSize: '12px', marginBottom: '8px' }}>
                    Your answer: {userAnswer !== null ? `${optionLabels[userAnswer]}) ${q.options[userAnswer].text}` : 'Not answered'}
                  </p>
                  {q.options.map((opt, oIndex) => (
                    <div
                      key={oIndex}
                      style={{
                        padding: '8px 12px',
                        marginBottom: '4px',
                        borderRadius: '6px',
                        background: opt.correct
                          ? 'rgba(16, 185, 129, 0.2)'
                          : userAnswer === oIndex
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'transparent',
                        color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary,
                      }}
                    >
                      {opt.correct ? '\u2713' : userAnswer === oIndex ? '\u2717' : '\u25CB'} {optionLabels[oIndex]}) {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    const optionLabels = ['A', 'B', 'C', 'D'];
    const currentAnswer = testAnswers[currentTestQuestion];
    const displayAnswer = answerConfirmed ? currentAnswer : pendingAnswer;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavigationBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>
                Question {currentTestQuestion + 1} of {testQuestions.length}
              </span>
            </div>

            {/* Scenario Context */}
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                Test your understanding of coupled oscillators. Consider how energy transfers between connected pendulums through spring coupling,
                how normal modes determine system behavior, and how coupling strength affects the beat frequency. Think about real-world applications
                like synchronized clocks, molecular vibrations, and power line engineering that rely on these fundamental physics principles.
              </p>
            </div>

            {/* Question progress dots */}
            <div style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '24px',
            }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null
                      ? colors.accent
                      : i === currentTestQuestion
                      ? colors.textMuted
                      : 'rgba(255,255,255,0.1)',
                  }}
                />
              ))}
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textSecondary, fontSize: '12px', marginBottom: '8px' }}>
                Q{currentTestQuestion + 1} of {testQuestions.length}
              </p>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>
                {currentQ.question}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => {
                const isSelected = displayAnswer === oIndex;
                const showResult = answerConfirmed && currentAnswer === oIndex;
                const isCorrectAnswer = opt.correct;

                let bgColor = 'transparent';
                let borderColor = 'rgba(255,255,255,0.2)';
                let textColor = colors.textPrimary;

                if (answerConfirmed) {
                  if (isCorrectAnswer) {
                    bgColor = 'rgba(16, 185, 129, 0.2)';
                    borderColor = colors.success;
                    textColor = colors.success;
                  } else if (showResult) {
                    bgColor = 'rgba(239, 68, 68, 0.2)';
                    borderColor = colors.error;
                    textColor = colors.error;
                  }
                } else if (isSelected) {
                  bgColor = 'rgba(139, 92, 246, 0.2)';
                  borderColor = colors.accent;
                }

                return (
                  <button
                    key={oIndex}
                    onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                    disabled={answerConfirmed}
                    style={{
                      padding: '16px',
                      minHeight: '44px',
                      borderRadius: '8px',
                      border: `2px solid ${borderColor}`,
                      background: bgColor,
                      color: textColor,
                      cursor: answerConfirmed ? 'default' : 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                      opacity: answerConfirmed && !isCorrectAnswer && !showResult ? 0.6 : 1,
                    }}
                  >
                    {optionLabels[oIndex]}) {opt.text}
                  </button>
                );
              })}
            </div>

            {/* Feedback after confirming answer */}
            {answerConfirmed && (
              <div style={{
                background: currentQ.options[currentAnswer!].correct
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(239, 68, 68, 0.2)',
                padding: '16px',
                borderRadius: '8px',
                marginTop: '16px',
                borderLeft: `3px solid ${currentQ.options[currentAnswer!].correct ? colors.success : colors.error}`,
              }}>
                <p style={{
                  color: currentQ.options[currentAnswer!].correct ? colors.success : colors.error,
                  fontWeight: 'bold',
                  marginBottom: '8px',
                }}>
                  {currentQ.options[currentAnswer!].correct ? '\u2713 Correct!' : '\u2717 Incorrect'}
                </p>
                <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                  {currentQ.options[currentAnswer!].correct
                    ? 'Great job! You understood this concept well.'
                    : `The correct answer is ${optionLabels[currentQ.options.findIndex(o => o.correct)]}). ${currentQ.options.find(o => o.correct)?.text}`
                  }
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button
              onClick={() => {
                if (currentTestQuestion > 0) {
                  setCurrentTestQuestion(currentTestQuestion - 1);
                  setPendingAnswer(null);
                  setAnswerConfirmed(testAnswers[currentTestQuestion - 1] !== null);
                }
              }}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>

            {!answerConfirmed && pendingAnswer !== null && (
              <button
                onClick={confirmAnswer}
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Check Answer
              </button>
            )}

            {answerConfirmed && currentTestQuestion < testQuestions.length - 1 && (
              <button
                onClick={goToNextQuestion}
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Next Question
              </button>
            )}

            {answerConfirmed && currentTestQuestion === testQuestions.length - 1 && (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (currentPhase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavigationBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You've mastered the physics of coupled oscillators
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Energy transfer between coupled oscillators</li>
              <li>Beat frequency from normal mode superposition</li>
              <li>Symmetric and antisymmetric normal modes</li>
              <li>Effect of coupling strength on transfer rate</li>
              <li>Phase relationships and synchronization</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(139, 92, 246, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Coupled oscillators appear in quantum mechanics (molecular vibrations),
              electronics (coupled resonators), biology (neural oscillators), and even
              social systems (synchronized applause). The mathematics you've learned
              scales from atoms to galaxies!
            </p>
          </div>

          {renderVisualization(true)}
        </div>
      </div>
    );
  }

  // Default fallback - should never reach here
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
      {renderNavigationBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px', textAlign: 'center' }}>
        <p style={{ color: colors.textSecondary }}>Loading...</p>
      </div>
    </div>
  );
};

export default CoupledPendulumsRenderer;
