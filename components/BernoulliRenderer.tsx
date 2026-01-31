'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// BERNOULLI RENDERER - LIFT & FLUID DYNAMICS
// Premium 10-phase educational game with premium design
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
// GAME CONTENT DATA
// ============================================================================

const predictions = {
  initial: {
    question: "You hold a strip of paper below your lips and blow across the top of it (not under it). What happens to the paper?",
    options: [
      { id: 'A', text: 'It bends downward from the force of air' },
      { id: 'B', text: 'It rises up toward the airflow' },
      { id: 'C', text: 'It stays perfectly still' },
      { id: 'D', text: 'It flaps back and forth randomly' },
    ],
    correct: 'B',
    explanation: "The paper rises! When you blow across the top, you create fast-moving air above and still air below. According to Bernoulli's principle, faster-moving air has LOWER pressure. The higher pressure below pushes the paper up into the low-pressure zone above. This is exactly how airplane wings generate lift!"
  },
  twist: {
    question: "A baseball pitcher throws a curveball. The ball spins as it travels, creating faster airflow on one side than the other. Which way does the ball curve?",
    options: [
      { id: 'A', text: 'Toward the side with faster-moving air (lower pressure)' },
      { id: 'B', text: 'Away from the side with faster-moving air' },
      { id: 'C', text: "It doesn't curve - that's an optical illusion" },
      { id: 'D', text: 'Straight down from gravity only' },
    ],
    correct: 'A',
    explanation: "The ball curves toward the low-pressure side! Spin drags air faster on one side (lower pressure) and slower on the other (higher pressure). The ball is pushed from high to low pressure - this is the Magnus effect! It's Bernoulli's principle applied to spinning objects."
  }
};

const realWorldApplications = [
  {
    id: 'airplane',
    title: 'Airplane Wings',
    icon: '✈️',
    subtitle: 'How 500 tons fly through air',
    description: 'Airplane wings are shaped so air travels faster over the curved top than under the flatter bottom. Faster air = lower pressure above the wing. The pressure difference creates lift - up to 500,000+ pounds for a 747!',
    formula: 'Lift = (1/2)rho*v^2*A*CL (air density x velocity^2 x wing area x lift coefficient)',
    realExample: 'A Boeing 747 wing creates enough lift to support 400 tons at takeoff speed of 180 mph.',
  },
  {
    id: 'curveball',
    title: 'Sports Spin',
    icon: '⚾',
    subtitle: 'Curving balls and soccer bends',
    description: "When a ball spins, it drags air faster on one side (creating low pressure) and slower on the other (higher pressure). The ball moves toward low pressure - that's the Magnus effect.",
    formula: 'Magnus Force proportional to spin rate x velocity x ball radius',
    realExample: 'A 90mph fastball with 2000 RPM spin can curve over 17 inches from a straight path!',
  },
  {
    id: 'venturi',
    title: 'Venturi Effect',
    icon: '💨',
    subtitle: 'Narrow pipes, fast flow',
    description: 'When fluid flows through a constriction, it speeds up (continuity) and pressure drops (Bernoulli). This powers carburetors, atomizers, and paint sprayers.',
    formula: 'A1*v1 = A2*v2 (continuity) + Bernoulli leads to P2 < P1 in narrow section',
    realExample: 'Perfume atomizers use venturi effect - fast air over a tube sucks up perfume to make mist.',
  },
  {
    id: 'shower',
    title: 'Shower Curtain Mystery',
    icon: '🚿',
    subtitle: 'Why it attacks you',
    description: 'Hot shower water creates a column of rising air (convection). This moving air has lower pressure than the still air outside. The pressure difference pushes the curtain inward!',
    formula: 'Moving air inside (low P) + Still air outside (high P) = Inward force',
    realExample: 'The shower curtain effect was officially studied and won an Ig Nobel Prize in 2001!',
  }
];

const quizQuestions = [
  {
    question: "According to Bernoulli's principle, when fluid speed increases, what happens to pressure?",
    options: [
      { text: "Pressure increases", correct: false },
      { text: "Pressure decreases", correct: true },
      { text: "Pressure stays the same", correct: false },
      { text: "Pressure becomes zero", correct: false },
    ],
  },
  {
    question: "How do airplane wings generate lift?",
    options: [
      { text: "By pushing air downward with propellers", correct: false },
      { text: "By creating higher pressure above the wing", correct: false },
      { text: "By creating lower pressure above the wing (faster airflow)", correct: true },
      { text: "By being lighter than air", correct: false },
    ],
  },
  {
    question: "What is the Bernoulli equation?",
    options: [
      { text: "F = ma", correct: false },
      { text: "E = mc^2", correct: false },
      { text: "P + (1/2)rho*v^2 + rho*g*h = constant", correct: true },
      { text: "PV = nRT", correct: false },
    ],
  },
  {
    question: "What causes a curveball to curve?",
    options: [
      { text: "Air resistance alone", correct: false },
      { text: "Gravity pulling it down", correct: false },
      { text: "The Magnus effect - spin creates pressure differences", correct: true },
      { text: "Optical illusion", correct: false },
    ],
  },
  {
    question: "What is the Venturi effect?",
    options: [
      { text: "Sound travels faster in tunnels", correct: false },
      { text: "Fluid speeds up and pressure drops in a constriction", correct: true },
      { text: "Water always flows downhill", correct: false },
      { text: "Hot air rises", correct: false },
    ],
  },
  {
    question: "Why does a shower curtain get sucked inward?",
    options: [
      { text: "Static electricity", correct: false },
      { text: "Water splashing on it", correct: false },
      { text: "Moving air from hot water has lower pressure than still air outside", correct: true },
      { text: "Magnetic forces", correct: false },
    ],
  },
  {
    question: "If you blow between two hanging pieces of paper, what happens?",
    options: [
      { text: "They blow apart", correct: false },
      { text: "They come together", correct: true },
      { text: "They don't move", correct: false },
      { text: "One rises, one falls", correct: false },
    ],
  },
  {
    question: "Why do race cars have spoilers that push down instead of up?",
    options: [
      { text: "To look cool", correct: false },
      { text: "Inverted wing shape creates downforce for better grip", correct: true },
      { text: "To reduce drag", correct: false },
      { text: "To cool the engine", correct: false },
    ],
  },
  {
    question: "What does the continuity equation state about fluid in a pipe?",
    options: [
      { text: "Pressure is constant", correct: false },
      { text: "Temperature is constant", correct: false },
      { text: "A1*v1 = A2*v2 (flow rate is constant)", correct: true },
      { text: "Density changes with speed", correct: false },
    ],
  },
  {
    question: "How do atomizers and spray bottles work?",
    options: [
      { text: "Pumping creates high pressure that pushes liquid out", correct: false },
      { text: "Fast air over a tube creates low pressure that sucks liquid up (Venturi)", correct: true },
      { text: "Chemical reaction produces gas", correct: false },
      { text: "Liquid is heated until it evaporates", correct: false },
    ],
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const BernoulliRenderer: React.FC<Props> = ({ onGameEvent, gamePhase, onPhaseComplete, onBack }) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // PREMIUM DESIGN SYSTEM
  // ─────────────────────────────────────────────────────────────────────────
  const colors = {
    primary: '#3b82f6',       // blue-500 (air/flow theme)
    primaryDark: '#2563eb',   // blue-600
    accent: '#06b6d4',        // cyan-500
    secondary: '#8b5cf6',     // violet-500
    success: '#10b981',       // emerald-500
    danger: '#ef4444',        // red-500
    warning: '#f59e0b',       // amber-500
    bgDark: '#020617',        // slate-950
    bgCard: '#0f172a',        // slate-900
    bgCardLight: '#1e293b',   // slate-800
    textPrimary: '#f8fafc',   // slate-50
    textSecondary: '#94a3b8', // slate-400
    textMuted: '#64748b',     // slate-500
    border: '#334155',        // slate-700
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
    elementGap: isMobile ? '8px' : '12px'
  };

  // Interactive state for simulation
  const [airSpeed, setAirSpeed] = useState(50);
  const [angleOfAttack, setAngleOfAttack] = useState(5);
  const [showPressure, setShowPressure] = useState(true);
  const [showStreamlines, setShowStreamlines] = useState(true);
  const [simulationMode, setSimulationMode] = useState<'wing' | 'ball'>('wing');
  const [ballSpin, setBallSpin] = useState(1500);
  const [animationTime, setAnimationTime] = useState(0);

  const animationRef = useRef<number>();

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

  // Calculate lift based on airspeed and angle of attack
  const calculateLift = useCallback((speed: number, angle: number) => {
    const stallAngle = 15;
    const effectiveAngle = Math.min(angle, stallAngle);
    const lift = (speed / 100) ** 2 * (effectiveAngle / 15) * 100;
    return Math.min(100, lift);
  }, []);

  // Calculate Magnus force for spinning ball
  const calculateMagnusForce = useCallback((speed: number, spin: number) => {
    return (speed / 100) * (spin / 2000) * 50;
  }, []);

  const lift = calculateLift(airSpeed, angleOfAttack);
  const magnusForce = calculateMagnusForce(airSpeed, ballSpin);

  const handlePrediction = useCallback((prediction: string) => {
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'A' ? 'success' : 'failure');
  }, [playSound]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  }, []);

  const handleAppComplete = useCallback((appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
  }, [playSound]);

  const calculateScore = () => testAnswers.reduce((score, answer, index) => score + (answer >= 0 && quizQuestions[index].options[answer]?.correct ? 1 : 0), 0);

  // ============================================================================
  // BERNOULLI SIMULATION VISUALIZATION
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
          {/* Premium sky gradient with atmospheric depth */}
          <linearGradient id="bernSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0c1929" />
            <stop offset="30%" stopColor="#1e3a5f" />
            <stop offset="70%" stopColor="#0f2847" />
            <stop offset="100%" stopColor="#0a1628" />
          </linearGradient>

          {/* Airfoil metal gradient with realistic depth */}
          <linearGradient id="bernAirfoilMetal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="15%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="85%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          {/* Low pressure zone glow (blue) */}
          <radialGradient id="bernLowPressureGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
            <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
          </radialGradient>

          {/* High pressure zone glow (amber) */}
          <radialGradient id="bernHighPressureGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
            <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </radialGradient>

          {/* Streamline particle glow */}
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

          {/* Lift arrow gradient */}
          <linearGradient id="bernLiftArrow" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#6ee7b7" />
          </linearGradient>

          {/* Wind arrow gradient */}
          <linearGradient id="bernWindArrow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#f8fafc" />
          </linearGradient>

          {/* Glow filters */}
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

          {/* Subtle grid pattern for lab feel */}
          <pattern id="bernLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e3a5f" strokeWidth="0.3" strokeOpacity="0.4" />
          </pattern>
        </defs>

        {/* Background with gradient and grid */}
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
                  {/* Streamline path with gradient stroke */}
                  <path
                    d={`M 0 ${yPos} Q ${centerX - 60} ${yPos} ${centerX - 20} ${yPos + yOffset * 0.3 * (lift / 100)} Q ${centerX + 20} ${yPos + yOffset * 0.5 * (lift / 100)} ${centerX + 60} ${yPos} L ${simWidth} ${yPos}`}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth={1.5}
                    opacity={0.5}
                  />
                  {/* Glowing particle */}
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
                  {/* Glowing particle */}
                  <circle cx={animOffset} cy={yPos} r={5} fill="url(#bernStreamParticleAmber)" filter="url(#bernParticleGlow)" />
                  <circle cx={animOffset} cy={yPos} r={2} fill="#ffffff" opacity={0.9} />
                </g>
              );
            })}
          </g>
        )}

        {/* Pressure regions with glow effects */}
        {showPressure && (
          <g>
            {/* Low pressure zone */}
            <ellipse
              cx={centerX}
              cy={centerY - 25}
              rx={70}
              ry={25}
              fill="url(#bernLowPressureGlow)"
              opacity={0.4 + (lift / 150)}
              filter="url(#bernPressureGlow)"
            />
            {/* High pressure zone */}
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

        {/* Airfoil with premium metal finish */}
        <g transform={`translate(${centerX}, ${centerY}) rotate(${-angleOfAttack})`}>
          {/* Shadow for depth */}
          <path
            d={`M ${-wingLength / 2 + 2} 3 Q ${-wingLength / 4} ${-15} 0 ${-19} Q ${wingLength / 4} ${-15} ${wingLength / 2 + 2} 3 Q ${wingLength / 4} 8 0 10 Q ${-wingLength / 4} 8 ${-wingLength / 2 + 2} 3`}
            fill="#0a1628"
            opacity={0.4}
          />
          {/* Main airfoil body */}
          <path
            d={`M ${-wingLength / 2} 0 Q ${-wingLength / 4} ${-18} 0 ${-22} Q ${wingLength / 4} ${-18} ${wingLength / 2} 0 Q ${wingLength / 4} 5 0 7 Q ${-wingLength / 4} 5 ${-wingLength / 2} 0`}
            fill="url(#bernAirfoilMetal)"
            stroke="#64748b"
            strokeWidth={1.5}
          />
          {/* Highlight for 3D effect */}
          <path
            d={`M ${-wingLength / 2 + 15} -2 Q ${-wingLength / 4} ${-16} 0 ${-20} Q ${wingLength / 4 - 10} ${-17} ${wingLength / 2 - 20} -4`}
            fill="none"
            stroke="#ffffff"
            strokeWidth={1}
            opacity={0.4}
          />
          {/* Leading edge highlight */}
          <ellipse cx={-wingLength / 2 + 5} cy={0} rx={3} ry={6} fill="#ffffff" opacity={0.2} />
        </g>

        {/* Lift arrow with glow */}
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

        {/* Wind indicator with gradient */}
        <g>
          <line x1={20} y1={centerY} x2={65} y2={centerY} stroke="url(#bernWindArrow)" strokeWidth={3} strokeLinecap="round" />
          <polygon points={`70,${centerY} 58,${centerY - 6} 58,${centerY + 6}`} fill="#f8fafc" />
        </g>
      </svg>
    );
  };

  // Labels rendered outside SVG for better typography
  const renderWingLabels = () => (
    <div className="absolute inset-0 pointer-events-none" style={{ fontSize: typo.small }}>
      {/* Pressure labels */}
      {showPressure && (
        <>
          <div
            className="absolute text-blue-400 font-semibold tracking-wide"
            style={{
              top: '25%',
              left: '50%',
              transform: 'translateX(-50%)',
              textShadow: '0 0 8px rgba(96, 165, 250, 0.5)'
            }}
          >
            LOW PRESSURE
          </div>
          <div
            className="absolute text-amber-400 font-semibold tracking-wide"
            style={{
              top: '62%',
              left: '50%',
              transform: 'translateX(-50%)',
              textShadow: '0 0 8px rgba(251, 191, 36, 0.5)'
            }}
          >
            HIGH PRESSURE
          </div>
        </>
      )}
      {/* Lift label */}
      {lift > 5 && (
        <div
          className="absolute text-emerald-400 font-bold"
          style={{
            top: `${35 - lift * 0.15}%`,
            left: '55%',
            textShadow: '0 0 8px rgba(52, 211, 153, 0.5)'
          }}
        >
          LIFT
        </div>
      )}
      {/* Wind info */}
      <div
        className="absolute text-slate-400"
        style={{ top: '42%', left: '2%', fontSize: typo.label }}
      >
        <div>Wind</div>
        <div className="font-mono text-slate-300">{airSpeed} m/s</div>
      </div>
      {/* Angle info */}
      <div
        className="absolute text-slate-400 text-right"
        style={{ top: '3%', right: '3%', fontSize: typo.label }}
      >
        Angle: <span className="text-slate-300 font-mono">{angleOfAttack}°</span>
      </div>
    </div>
  );

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
          {/* Premium field gradient with depth */}
          <linearGradient id="bernFieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="20%" stopColor="#065f46" />
            <stop offset="50%" stopColor="#047857" />
            <stop offset="80%" stopColor="#065f46" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>

          {/* Baseball leather gradient */}
          <radialGradient id="bernBaseballLeather" cx="35%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#fafaf9" />
            <stop offset="70%" stopColor="#e7e5e4" />
            <stop offset="100%" stopColor="#d6d3d1" />
          </radialGradient>

          {/* Baseball seam color */}
          <linearGradient id="bernSeamColor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>

          {/* Magnus force arrow gradient (pink) */}
          <linearGradient id="bernMagnusArrow" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#db2777" />
            <stop offset="50%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#fbcfe8" />
          </linearGradient>

          {/* Trajectory glow */}
          <linearGradient id="bernTrajectoryGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.2" />
          </linearGradient>

          {/* Fast air streamline glow */}
          <linearGradient id="bernFastAirGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.3" />
          </linearGradient>

          {/* Slow air streamline glow */}
          <linearGradient id="bernSlowAirGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#fde68a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.3" />
          </linearGradient>

          {/* Filters */}
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

          {/* Grass texture pattern */}
          <pattern id="bernGrassPattern" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="none" />
            <line x1="0" y1="8" x2="2" y2="0" stroke="#059669" strokeWidth="0.5" strokeOpacity="0.3" />
            <line x1="4" y1="8" x2="6" y2="0" stroke="#059669" strokeWidth="0.5" strokeOpacity="0.2" />
          </pattern>
        </defs>

        {/* Background with gradient and grass texture */}
        <rect width={simWidth} height={simHeight} fill="url(#bernFieldGrad)" />
        <rect width={simWidth} height={simHeight} fill="url(#bernGrassPattern)" />

        {/* Trajectory path with glow */}
        <path
          d={`M 50 ${centerY} Q ${simWidth / 2} ${centerY + curveAmount * 3} ${simWidth - 50} ${centerY}`}
          fill="none"
          stroke="url(#bernTrajectoryGlow)"
          strokeWidth={4}
          strokeDasharray="12,6"
          opacity={0.7}
        />

        {/* Streamlines around ball with glow effects */}
        {showStreamlines && ballX > 0 && ballX < simWidth && (
          <g transform={`translate(${ballX}, ${ballY})`}>
            {/* Fast air (top when backspin, bottom when topspin) */}
            <path
              d={`M -55 ${-15 * spinDirection} Q -15 ${-40 * spinDirection} 40 ${-15 * spinDirection}`}
              fill="none"
              stroke="url(#bernFastAirGlow)"
              strokeWidth={3}
              filter="url(#bernStreamlineGlow)"
            />
            {/* Slow air */}
            <path
              d={`M -55 ${15 * spinDirection} Q -15 ${30 * spinDirection} 40 ${15 * spinDirection}`}
              fill="none"
              stroke="url(#bernSlowAirGlow)"
              strokeWidth={3}
              filter="url(#bernStreamlineGlow)"
            />
          </g>
        )}

        {/* Baseball with premium shading */}
        <g transform={`translate(${ballX}, ${ballY}) rotate(${animationTime * ballSpin * 0.1})`} filter="url(#bernBallShadow)">
          {/* Main ball body */}
          <circle r={24} fill="url(#bernBaseballLeather)" />
          {/* Outer edge darkening */}
          <circle r={24} fill="none" stroke="#a8a29e" strokeWidth={1.5} />
          {/* Inner highlight */}
          <circle cx={-6} cy={-6} r={8} fill="#ffffff" opacity={0.3} />
          {/* Seams with depth */}
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
          {/* Seam stitches */}
          {[-14, -7, 0, 7, 14].map((x, i) => (
            <g key={`stitch-${i}`}>
              <line x1={x - 1} y1={-15 + Math.abs(x) * 0.2} x2={x + 1} y2={-13 + Math.abs(x) * 0.2} stroke="#b91c1c" strokeWidth={1} />
              <line x1={x - 1} y1={15 - Math.abs(x) * 0.2} x2={x + 1} y2={13 - Math.abs(x) * 0.2} stroke="#b91c1c" strokeWidth={1} />
            </g>
          ))}
        </g>

        {/* Magnus force arrow with glow */}
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
      </svg>
    );
  };

  // Ball simulation labels rendered outside SVG
  const renderBallLabels = () => {
    const simWidth = isMobile ? 320 : 500;
    const ballX = (animationTime * airSpeed * 2) % (simWidth + 100) - 50;
    const spinDirection = ballSpin > 0 ? 1 : -1;
    const showLabelsNearBall = showStreamlines && ballX > 50 && ballX < simWidth - 50;

    return (
      <div className="absolute inset-0 pointer-events-none" style={{ fontSize: typo.small }}>
        {/* Spin info */}
        <div
          className="absolute text-white font-mono text-right"
          style={{ top: '3%', right: '3%', fontSize: typo.label }}
        >
          Spin: <span className="text-slate-200">{ballSpin} RPM</span>
        </div>

        {/* Fast/Slow pressure labels near ball */}
        {showLabelsNearBall && (
          <>
            <div
              className="absolute text-blue-400 font-medium"
              style={{
                top: spinDirection > 0 ? '25%' : '65%',
                left: `${(ballX / simWidth) * 100}%`,
                transform: 'translateX(-50%)',
                fontSize: typo.label,
                textShadow: '0 0 6px rgba(96, 165, 250, 0.6)'
              }}
            >
              Fast (Low P)
            </div>
            <div
              className="absolute text-amber-400 font-medium"
              style={{
                top: spinDirection > 0 ? '65%' : '25%',
                left: `${(ballX / simWidth) * 100}%`,
                transform: 'translateX(-50%)',
                fontSize: typo.label,
                textShadow: '0 0 6px rgba(251, 191, 36, 0.6)'
              }}
            >
              Slow (High P)
            </div>
          </>
        )}

        {/* Magnus label */}
        {Math.abs(ballSpin) > 100 && ballX > 80 && ballX < simWidth - 80 && (
          <div
            className="absolute text-pink-400 font-bold"
            style={{
              top: '35%',
              left: `${(ballX / simWidth) * 100 + 5}%`,
              fontSize: typo.small,
              textShadow: '0 0 8px rgba(244, 114, 182, 0.6)'
            }}
          >
            Magnus
          </div>
        )}

        {/* Bottom info */}
        <div
          className="absolute text-slate-400 text-center w-full"
          style={{ bottom: '3%', fontSize: typo.label }}
        >
          Ball curves <span className="text-slate-200">{magnusForce > 0 ? 'UP' : magnusForce < 0 ? 'DOWN' : 'straight'}</span> (Magnus effect)
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-blue-400 tracking-wide">FLUID DYNAMICS</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent">
        Why Planes Fly
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover Bernoulli's Principle - the secret behind flight, curveballs, and everyday phenomena. Learn how faster-moving fluids create lower pressure.
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 rounded-3xl" />
        <div className="relative">
          <div className="text-7xl mb-6">✈️</div>
          <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
            <span className="text-xl font-mono text-blue-300">P + (1/2)rho*v^2 = constant</span>
          </div>
          <p className="text-xl text-white/90 font-medium leading-relaxed">
            Daniel Bernoulli discovered the answer 300 years ago: faster fluid = lower pressure. A 500-ton airplane floats through the air using this principle!
          </p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('predict')}
        style={{ zIndex: 10 }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Start Learning
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2"><span className="text-blue-400">*</span>Wing Simulation</div>
        <div className="flex items-center gap-2"><span className="text-blue-400">*</span>Magnus Effect</div>
        <div className="flex items-center gap-2"><span className="text-blue-400">*</span>Real Applications</div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>

      {/* Static simulation preview with premium graphics */}
      <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-4 border border-slate-700/50 mb-6 opacity-90">
        <svg width={320} height={150} className="mx-auto">
          <defs>
            {/* Premium sky gradient */}
            <linearGradient id="predictSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0c1929" />
              <stop offset="40%" stopColor="#1e3a5f" />
              <stop offset="100%" stopColor="#0a1628" />
            </linearGradient>
            {/* Airfoil metal gradient */}
            <linearGradient id="predictAirfoilMetal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="20%" stopColor="#e2e8f0" />
              <stop offset="60%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
            {/* Subtle air flow indicators */}
            <linearGradient id="predictFlowBlue" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0" />
              <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="predictFlowAmber" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </linearGradient>
            {/* Grid pattern */}
            <pattern id="predictGrid" width="16" height="16" patternUnits="userSpaceOnUse">
              <rect width="16" height="16" fill="none" stroke="#1e3a5f" strokeWidth="0.3" strokeOpacity="0.4" />
            </pattern>
          </defs>
          <rect width={320} height={150} fill="url(#predictSkyGrad)" />
          <rect width={320} height={150} fill="url(#predictGrid)" />

          {/* Static flow lines */}
          <path d="M 0 50 Q 120 48 160 45 Q 200 42 320 50" fill="none" stroke="url(#predictFlowBlue)" strokeWidth={2} />
          <path d="M 0 60 Q 130 58 160 52 Q 190 48 320 60" fill="none" stroke="url(#predictFlowBlue)" strokeWidth={2} />
          <path d="M 0 90 Q 130 92 160 98 Q 190 100 320 90" fill="none" stroke="url(#predictFlowAmber)" strokeWidth={2} />
          <path d="M 0 100 Q 120 102 160 105 Q 200 107 320 100" fill="none" stroke="url(#predictFlowAmber)" strokeWidth={2} />

          {/* Airfoil with premium finish */}
          <g transform="translate(160, 75)">
            {/* Shadow */}
            <path
              d={`M -58 3 Q -28 -14 2 -18 Q 32 -14 62 3 Q 32 9 2 11 Q -28 9 -58 3`}
              fill="#0a1628"
              opacity={0.4}
            />
            {/* Main body */}
            <path
              d={`M -60 0 Q -30 -18 0 -22 Q 30 -18 60 0 Q 30 5 0 7 Q -30 5 -60 0`}
              fill="url(#predictAirfoilMetal)"
              stroke="#64748b"
              strokeWidth={1.5}
            />
            {/* Highlight */}
            <path
              d={`M -45 -2 Q -20 -16 0 -20 Q 20 -17 40 -5`}
              fill="none"
              stroke="#ffffff"
              strokeWidth={0.8}
              opacity={0.4}
            />
          </g>
        </svg>
        <div className="text-center mt-2" style={{ fontSize: typo.label, color: colors.textSecondary }}>
          Wing cross-section
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6 border border-slate-700/50">
        <p className="text-lg text-slate-300 mb-4">{predictions.initial.question}</p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {predictions.initial.options.map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{ zIndex: 10 }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>
      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl border border-slate-700/50">
          <p className="text-emerald-400 font-semibold mb-2">{selectedPrediction === 'B' ? 'Correct!' : 'Not quite!'}</p>
          <p className="text-slate-300 text-sm">{predictions.initial.explanation}</p>
          <button onClick={() => goToPhase('play')} style={{ zIndex: 10 }} className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl">
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Bernoulli Lab</h2>
      <p className="text-slate-400 mb-6 text-center max-w-lg">Adjust the sliders to see how airspeed, wing angle, and pipe width affect pressure and lift.</p>

      <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-4 border border-slate-700/50 mb-6 relative overflow-hidden">
        {simulationMode === 'wing' ? (
          <>
            {renderWingSimulation()}
            {renderWingLabels()}
          </>
        ) : (
          <>
            {renderBallSimulation()}
            {renderBallLabels()}
          </>
        )}
      </div>

      {/* Data panel */}
      <div className="grid grid-cols-3 gap-3 mb-6 w-full max-w-lg">
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-blue-400">Flow Rate</div>
          <div className="text-lg font-bold text-white">{airSpeed} m/s</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-emerald-400">{simulationMode === 'wing' ? 'Lift Force' : 'Magnus Force'}</div>
          <div className="text-lg font-bold text-white">{simulationMode === 'wing' ? `${lift.toFixed(0)}%` : `${magnusForce.toFixed(1)} N`}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-amber-400">{simulationMode === 'wing' ? 'Pipe Width' : 'Spin'}</div>
          <div className="text-lg font-bold text-white">{simulationMode === 'wing' ? `${angleOfAttack}deg` : `${ballSpin} RPM`}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-2 gap-4 w-full max-w-lg mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-blue-500/30">
          <label className="text-blue-400 text-sm block mb-2">Flow Rate: {airSpeed} m/s</label>
          <input type="range" min={10} max={100} value={airSpeed} onChange={(e) => setAirSpeed(Number(e.target.value))} className="w-full accent-blue-500" />
        </div>
        {simulationMode === 'wing' ? (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-amber-500/30">
            <label className="text-amber-400 text-sm block mb-2">Wing Angle: {angleOfAttack}deg {angleOfAttack > 12 && <span className="text-pink-400">Near stall!</span>}</label>
            <input type="range" min={0} max={20} value={angleOfAttack} onChange={(e) => setAngleOfAttack(Number(e.target.value))} className="w-full accent-amber-500" />
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-pink-500/30">
            <label className="text-pink-400 text-sm block mb-2">Ball Spin: {ballSpin} RPM</label>
            <input type="range" min={-2500} max={2500} value={ballSpin} onChange={(e) => setBallSpin(Number(e.target.value))} className="w-full accent-pink-500" />
          </div>
        )}
      </div>

      {/* Quick buttons */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        <button onClick={() => setShowStreamlines(!showStreamlines)} style={{ zIndex: 10 }} className={`px-4 py-2 rounded-lg text-sm font-medium ${showStreamlines ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
          Flow {showStreamlines ? 'ON' : 'OFF'}
        </button>
        <button onClick={() => setShowPressure(!showPressure)} style={{ zIndex: 10 }} className={`px-4 py-2 rounded-lg text-sm font-medium ${showPressure ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
          Pressure {showPressure ? 'ON' : 'OFF'}
        </button>
        <button onClick={() => setSimulationMode('wing')} style={{ zIndex: 10 }} className={`px-4 py-2 rounded-lg text-sm font-medium ${simulationMode === 'wing' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
          Wing
        </button>
        <button onClick={() => setSimulationMode('ball')} style={{ zIndex: 10 }} className={`px-4 py-2 rounded-lg text-sm font-medium ${simulationMode === 'ball' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
          Ball
        </button>
      </div>

      <div className="bg-blue-900/30 rounded-xl p-4 max-w-lg border border-blue-700/30 mb-6">
        <h3 className="text-blue-400 font-semibold mb-2">Key Insight</h3>
        <p className="text-slate-300 text-sm">Watch how faster flow creates lower pressure above the wing. The pressure difference pushes the wing UP - that's lift!</p>
      </div>

      <button onClick={() => goToPhase('review')} style={{ zIndex: 10 }} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl">
        Review the Concepts
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Bernoulli's Principle</h2>

      <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-2xl p-6 max-w-2xl mb-6 border border-emerald-700/30">
        <h3 className="text-xl font-bold text-emerald-400 mb-4">The Key Result</h3>
        <div className="bg-slate-900/50 rounded-xl p-4 mb-4 text-center">
          <span className="text-2xl font-mono text-emerald-300">Faster Flow = Lower Pressure</span>
        </div>
        <p className="text-slate-300">When fluid speeds up (like air over a wing), its pressure drops. This is because energy is conserved - kinetic energy increases, so pressure energy must decrease.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 rounded-2xl p-6 border border-blue-700/30">
          <h3 className="text-xl font-bold text-blue-400 mb-3">The Bernoulli Equation</h3>
          <div className="bg-slate-900/50 rounded-lg p-3 mb-3 text-center">
            <span className="text-xl font-mono text-blue-300">P + (1/2)rho*v^2 + rho*g*h = const</span>
          </div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>P = Pressure energy</li>
            <li>(1/2)rho*v^2 = Kinetic energy</li>
            <li>rho*g*h = Potential energy</li>
            <li>Total energy is conserved along streamline</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 border border-emerald-700/30">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Wing Lift Explained</h3>
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
              <div className="text-xs text-slate-400">Delta P = Lift</div>
            </div>
          </div>
          <p className="text-slate-300 text-sm">Curved top = fast air = low pressure. Flat bottom = slow air = high pressure. The difference pushes the wing up!</p>
        </div>
      </div>
      <button onClick={() => goToPhase('twist_predict')} style={{ zIndex: 10 }} className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Discover the Magnus Effect
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">New Scenario: The Curveball Challenge</h2>

      <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-4 border border-amber-700/30 mb-6 opacity-90">
        <svg width={280} height={120} className="mx-auto">
          <defs>
            {/* Premium field gradient */}
            <linearGradient id="twistFieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#064e3b" />
              <stop offset="50%" stopColor="#047857" />
              <stop offset="100%" stopColor="#065f46" />
            </linearGradient>
            {/* Baseball leather */}
            <radialGradient id="twistBallLeather" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#fafaf9" />
              <stop offset="100%" stopColor="#d6d3d1" />
            </radialGradient>
            {/* Seam gradient */}
            <linearGradient id="twistSeamRed" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
            {/* Spin motion arrows */}
            <linearGradient id="twistSpinArrow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.3" />
            </linearGradient>
            {/* Ball shadow filter */}
            <filter id="twistBallShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#0a0a0a" floodOpacity="0.4" />
            </filter>
          </defs>

          <rect width={280} height={120} fill="url(#twistFieldGrad)" rx={8} />

          {/* Spin motion curves */}
          <path d="M 95 45 Q 115 30 140 35" fill="none" stroke="url(#twistSpinArrow)" strokeWidth={2} strokeDasharray="4,3" />
          <path d="M 185 45 Q 165 30 140 35" fill="none" stroke="url(#twistSpinArrow)" strokeWidth={2} strokeDasharray="4,3" />
          <path d="M 95 75 Q 115 90 140 85" fill="none" stroke="url(#twistSpinArrow)" strokeWidth={2} strokeDasharray="4,3" />
          <path d="M 185 75 Q 165 90 140 85" fill="none" stroke="url(#twistSpinArrow)" strokeWidth={2} strokeDasharray="4,3" />

          {/* Baseball with premium shading */}
          <g transform="translate(140, 60)" filter="url(#twistBallShadow)">
            <circle r={22} fill="url(#twistBallLeather)" />
            <circle r={22} fill="none" stroke="#a8a29e" strokeWidth={1.5} />
            {/* Highlight */}
            <circle cx={-5} cy={-5} r={7} fill="#ffffff" opacity={0.3} />
            {/* Seams */}
            <path d="M -17 -8 Q -7 -19, 2 -13 Q 11 -8, 19 -13" fill="none" stroke="url(#twistSeamRed)" strokeWidth={2.5} strokeLinecap="round" />
            <path d="M -17 8 Q -7 19, 2 13 Q 11 8, 19 13" fill="none" stroke="url(#twistSeamRed)" strokeWidth={2.5} strokeLinecap="round" />
          </g>

          {/* Rotation indicator arrows */}
          <g transform="translate(140, 60)">
            <path d="M 32 -8 A 35 35 0 0 1 32 8" fill="none" stroke="#60a5fa" strokeWidth={2} markerEnd="url(#twistArrow)" />
            <polygon points="34,10 28,6 30,12" fill="#60a5fa" />
          </g>
        </svg>
        <div className="text-center mt-2" style={{ fontSize: typo.label, color: colors.textSecondary }}>
          Spinning baseball
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6 border border-amber-700/30">
        <p className="text-lg text-slate-300 mb-4">{predictions.twist.question}</p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {predictions.twist.options.map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{ zIndex: 10 }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'A' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'A' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>
      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl border border-slate-700/50">
          <p className="text-emerald-400 font-semibold mb-2">{twistPrediction === 'A' ? 'Excellent!' : 'Interesting guess!'}</p>
          <p className="text-slate-300 text-sm">{predictions.twist.explanation}</p>
          <button onClick={() => goToPhase('twist_play')} style={{ zIndex: 10 }} className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
            See the Magnus Effect
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Magnus Effect Lab</h2>
      <p className="text-slate-400 mb-6 text-center">Adjust the angle of attack and spin to see how airflow creates lift on different shapes!</p>

      <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-4 border border-slate-700/50 mb-6 relative overflow-hidden">
        {renderBallSimulation()}
        {renderBallLabels()}
      </div>

      <div className="grid md:grid-cols-2 gap-4 w-full max-w-lg mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-blue-500/30">
          <label className="text-blue-400 text-sm block mb-2">Pitch Speed: {airSpeed} m/s</label>
          <input type="range" min={10} max={100} value={airSpeed} onChange={(e) => setAirSpeed(Number(e.target.value))} className="w-full accent-blue-500" />
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-pink-500/30">
          <label className="text-pink-400 text-sm block mb-2">Ball Spin (Angle of Attack): {ballSpin} RPM</label>
          <input type="range" min={-2500} max={2500} value={ballSpin} onChange={(e) => setBallSpin(Number(e.target.value))} className="w-full accent-pink-500" />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Backspin</span>
            <span>Topspin</span>
          </div>
        </div>
      </div>

      <div className="bg-pink-900/30 rounded-xl p-4 max-w-lg border border-pink-700/30 mb-6">
        <h3 className="text-pink-400 font-semibold mb-2">The Magnus Effect</h3>
        <p className="text-slate-300 text-sm">Spin drags air faster on one side (lower pressure) and slower on the other. The ball is pushed from high to low pressure - creating curves that seem to defy physics! This same principle applies to airplane wings at different angles.</p>
      </div>

      <button onClick={() => goToPhase('twist_review')} style={{ zIndex: 10 }} className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Review the Discovery
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Magnus Effect & Lift Explained</h2>
      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl mb-6 border border-amber-700/30">
        <h3 className="text-xl font-bold text-amber-400 mb-4">How Bernoulli Creates Lift</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <h4 className="text-blue-400 font-semibold mb-2">Topspin (Ball)</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>Top moves with airflow (faster)</li>
              <li>Bottom moves against (slower)</li>
              <li>Ball curves DOWN</li>
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <h4 className="text-amber-400 font-semibold mb-2">Backspin (Ball)</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>Bottom moves with airflow (faster)</li>
              <li>Top moves against (slower)</li>
              <li>Ball curves UP (floats)</li>
            </ul>
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 mt-4">
          <h4 className="text-emerald-400 font-semibold mb-2">Airplane Wings</h4>
          <p className="text-slate-300 text-sm">Wings use the same principle! The curved top creates faster airflow (low pressure) while the flat bottom has slower airflow (high pressure). The pressure difference creates lift!</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 mt-4 text-center">
          <span className="text-pink-400 font-mono">F_Magnus proportional to omega x v</span>
        </div>
      </div>
      <button onClick={() => goToPhase('transfer')} style={{ zIndex: 10 }} className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl">
        Explore Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Bernoulli Everywhere</h2>
      <p className="text-slate-400 mb-6 text-center max-w-lg">Explore 4 real-world applications of Bernoulli's Principle</p>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {realWorldApplications.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveAppTab(index)}
            style={{ zIndex: 10 }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index ? 'bg-blue-600 text-white'
              : completedApps.has(index) ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {app.title.split(' ')[0]}
          </button>
        ))}
      </div>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full border border-slate-700/50">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{realWorldApplications[activeAppTab].icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{realWorldApplications[activeAppTab].title}</h3>
            <p className="text-slate-400 text-sm">{realWorldApplications[activeAppTab].subtitle}</p>
          </div>
        </div>
        <p className="text-slate-300 mb-4">{realWorldApplications[activeAppTab].description}</p>
        <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
          <span className="text-blue-400 text-sm font-mono">{realWorldApplications[activeAppTab].formula}</span>
        </div>
        <div className="bg-emerald-900/30 rounded-lg p-3 border border-emerald-700/30">
          <p className="text-emerald-400 text-sm">{realWorldApplications[activeAppTab].realExample}</p>
        </div>
        {!completedApps.has(activeAppTab) ? (
          <button onClick={() => handleAppComplete(activeAppTab)} style={{ zIndex: 10 }} className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium">
            Mark as Understood
          </button>
        ) : (
          <button
            onClick={() => {
              if (activeAppTab < realWorldApplications.length - 1) {
                setActiveAppTab(activeAppTab + 1);
              }
            }}
            style={{ zIndex: 10 }}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium"
          >
            Next Application
          </button>
        )}
      </div>
      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">{realWorldApplications.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />))}</div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>
      {completedApps.size >= 4 && (
        <button onClick={() => goToPhase('test')} style={{ zIndex: 10 }} className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl">
          Take the Knowledge Test
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>
      <p className="text-slate-400 mb-6 text-center">Answer all 10 questions to test your understanding of Bernoulli's Principle</p>

      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full max-h-[60vh] overflow-y-auto">
          {quizQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    style={{ zIndex: 10 }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={() => { setShowTestResults(true); playSound('complete'); }}
            disabled={testAnswers.includes(-1)}
            style={{ zIndex: 10 }}
            className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(-1) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'}`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center border border-slate-700/50">
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🏆' : '📚'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/10</h3>
          <p className="text-slate-300 mb-6">{calculateScore() >= 7 ? "Excellent! You've mastered fluid dynamics!" : 'Keep studying! Review and try again.'}</p>
          {calculateScore() >= 7 ? (
            <button onClick={() => goToPhase('mastery')} style={{ zIndex: 10 }} className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl">
              Claim Your Mastery Badge
            </button>
          ) : (
            <button onClick={() => { setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase('review'); }} style={{ zIndex: 10 }} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl">
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-blue-900/50 via-indigo-900/50 to-purple-900/50 rounded-3xl p-8 max-w-2xl border border-blue-700/30">
        <div className="text-8xl mb-6">✈️</div>
        <h1 className="text-3xl font-bold text-white mb-4">Congratulations!</h1>
        <h2 className="text-2xl font-bold text-emerald-400 mb-4">Fluid Dynamics Master!</h2>
        <p className="text-xl text-slate-300 mb-6">You've mastered Bernoulli's Principle and the Magnus Effect!</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">✈️</div><p className="text-sm text-slate-300">Airplane Lift</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">⚾</div><p className="text-sm text-slate-300">Curveballs</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">💨</div><p className="text-sm text-slate-300">Venturi Effect</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🚿</div><p className="text-sm text-slate-300">Shower Curtain</p></div>
        </div>
        <div className="bg-emerald-900/30 rounded-xl p-4 border border-emerald-700/30 mb-6">
          <p className="text-emerald-400">You now understand how pressure differences in moving fluids create forces that power flight, curve balls, and drive everyday phenomena!</p>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => goToPhase('hook')} style={{ zIndex: 10 }} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl">Explore Again</button>
          {onBack && <button onClick={() => onBack()} style={{ zIndex: 10 }} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl">Return to Dashboard</button>}
        </div>
      </div>
    </div>
  );

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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Bernoulli's Principle</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-blue-400 w-6 shadow-lg shadow-blue-400/30'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-blue-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default BernoulliRenderer;
