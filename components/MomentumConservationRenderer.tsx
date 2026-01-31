'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// MOMENTUM CONSERVATION - Premium 10-Phase Design
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

interface MomentumConservationRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
  setTestScore?: (score: number) => void;
}

const MomentumConservationRenderer: React.FC<MomentumConservationRendererProps> = ({
  onGameEvent,
  gamePhase,
  onPhaseComplete,
  setTestScore
}) => {
  // Phase state
  const [phase, setPhase] = useState<Phase>('hook');

  // Sync phase with external prop
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
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

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [massLeft, setMassLeft] = useState(1);
  const [massRight, setMassRight] = useState(2);
  const [hasFriction, setHasFriction] = useState(false);
  const [isCompressed, setIsCompressed] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [leftPos, setLeftPos] = useState(0);
  const [rightPos, setRightPos] = useState(0);
  const [leftVel, setLeftVel] = useState(0);
  const [rightVel, setRightVel] = useState(0);
  const [experimentCount, setExperimentCount] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  const animationRef = useRef<number>();

  // Test questions - 10 questions with correct: true
  const testQuestions = [
    {
      question: "Two carts push off each other. If cart A is heavier, which cart moves faster?",
      options: [
        { text: "Cart A (heavier)", correct: false },
        { text: "Cart B (lighter)", correct: true },
        { text: "Both same speed", correct: false },
        { text: "Neither moves", correct: false }
      ],
      explanation: "The lighter cart moves faster. Since momentum is conserved and starts at zero, m₁v₁ = m₂v₂. The lighter cart needs higher velocity to match the heavier cart's momentum."
    },
    {
      question: "What is the total momentum before and after two stationary carts push off?",
      options: [
        { text: "Increases after", correct: false },
        { text: "Decreases after", correct: false },
        { text: "Zero both times", correct: true },
        { text: "Depends on masses", correct: false }
      ],
      explanation: "Total momentum is conserved. Starting at rest = zero momentum. After pushing, momenta are equal and opposite, still summing to zero."
    },
    {
      question: "If a 1kg cart and 3kg cart push off, and the 1kg cart moves at 6 m/s, how fast is the 3kg cart?",
      options: [
        { text: "6 m/s", correct: false },
        { text: "2 m/s", correct: true },
        { text: "18 m/s", correct: false },
        { text: "3 m/s", correct: false }
      ],
      explanation: "Using p₁ = p₂: 1kg × 6m/s = 3kg × v₂, so v₂ = 2 m/s. The heavier cart moves slower."
    },
    {
      question: "Why doesn't total momentum equal zero on carpet (with friction)?",
      options: [
        { text: "Friction creates momentum", correct: false },
        { text: "Momentum transfers to Earth", correct: true },
        { text: "Carts are heavier", correct: false },
        { text: "Momentum is destroyed", correct: false }
      ],
      explanation: "Friction transfers momentum to Earth. The Earth-cart system still conserves momentum, but Earth's huge mass means negligible motion."
    },
    {
      question: "Two ice skaters push off each other. What happens?",
      options: [
        { text: "Only lighter one moves", correct: false },
        { text: "Only heavier one moves", correct: false },
        { text: "Both move opposite ways", correct: true },
        { text: "Neither moves on ice", correct: false }
      ],
      explanation: "Both skaters move in opposite directions. The lighter skater moves faster, but both acquire equal and opposite momenta."
    },
    {
      question: "Momentum is calculated as:",
      options: [
        { text: "mass × acceleration", correct: false },
        { text: "mass × velocity", correct: true },
        { text: "force × time", correct: false },
        { text: "mass × distance", correct: false }
      ],
      explanation: "Momentum (p) equals mass times velocity: p = mv. It's a vector quantity with both magnitude and direction."
    },
    {
      question: "A gun recoils when fired. This demonstrates:",
      options: [
        { text: "Energy conservation", correct: false },
        { text: "Momentum conservation", correct: true },
        { text: "Mass conservation", correct: false },
        { text: "Friction effects", correct: false }
      ],
      explanation: "Gun recoil demonstrates momentum conservation. The bullet gains forward momentum, so the gun gains equal backward momentum."
    },
    {
      question: "If you double both masses but keep the spring the same, what happens to velocities?",
      options: [
        { text: "Both double", correct: false },
        { text: "Both halve", correct: true },
        { text: "Stay the same", correct: false },
        { text: "One doubles, one halves", correct: false }
      ],
      explanation: "Same spring impulse but doubled masses means both velocities halve. Total momentum of each cart stays similar, but v = p/m means lower velocity."
    },
    {
      question: "Why is momentum a vector quantity?",
      options: [
        { text: "Only has magnitude", correct: false },
        { text: "Has magnitude and direction", correct: true },
        { text: "Always positive", correct: false },
        { text: "Doesn't change", correct: false }
      ],
      explanation: "Momentum is a vector because it has both magnitude (how much) and direction (which way). Opposite momenta cancel in the sum."
    },
    {
      question: "In space, an astronaut throws a tool. What happens?",
      options: [
        { text: "Only tool moves", correct: false },
        { text: "Both move opposite ways", correct: true },
        { text: "Neither moves in space", correct: false },
        { text: "Astronaut moves faster", correct: false }
      ],
      explanation: "Both move in opposite directions due to momentum conservation. The lighter tool moves faster than the heavier astronaut."
    }
  ];

  // Real-world applications - 4 applications
  const applications = [
    {
      id: 'car_crashes',
      title: "Car Crashes",
      description: "In collisions, momentum is transferred between vehicles. Crumple zones extend collision time, reducing peak force while conserving total momentum. Heavier vehicles transfer more momentum to lighter ones.",
      formula: "p₁ + p₂ = p₁' + p₂'",
      stat: "Crumple zones reduce peak force by 50%",
      color: '#ef4444',
    },
    {
      id: 'rockets',
      title: "Rockets",
      description: "Rockets expel exhaust gases backward at high speed, gaining forward momentum. The faster and more massive the exhaust, the more thrust generated. This works even in the vacuum of space!",
      formula: "F = Δp/Δt = ṁ × vₑ",
      stat: "Saturn V thrust: 35 million N",
      color: '#f97316',
    },
    {
      id: 'billiards',
      title: "Billiards",
      description: "When the cue ball strikes another ball, momentum transfers. A direct center hit can transfer nearly all momentum to the target ball, stopping the cue. Angles create split momentum.",
      formula: "m₁v₁ = m₁v₁' + m₂v₂'",
      stat: "Cue ball: ~170g at 10 m/s",
      color: '#22c55e',
    },
    {
      id: 'newtons_cradle',
      title: "Newton's Cradle",
      description: "Momentum transfers through the balls via elastic collisions. Lift one ball, and one ball swings out the other side with nearly equal momentum. Energy and momentum both conserved!",
      formula: "p_before = p_after",
      stat: "~95% momentum transfer",
      color: '#3b82f6',
    }
  ];

  // Effects
  useEffect(() => {
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // Web Audio API sound
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

  // Emit game events
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Return to dashboard handler
  const handleReturnToDashboard = useCallback(() => {
    emitEvent('mastery_achieved', { action: 'return_to_dashboard' });
    window.dispatchEvent(new CustomEvent('returnToDashboard'));
  }, [emitEvent]);

  // Navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    if (!phaseOrder.includes(newPhase)) return;
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(newPhase);
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  // Physics simulation
  const releaseCarts = useCallback(() => {
    if (isAnimating || !isCompressed) return;
    setIsAnimating(true);
    setIsCompressed(false);

    const springImpulse = 10;
    const initialVelLeft = -springImpulse / massLeft;
    const initialVelRight = springImpulse / massRight;
    const friction = hasFriction ? 0.015 : 0.001;

    let vL = initialVelLeft;
    let vR = initialVelRight;
    let pL = 0;
    let pR = 0;

    emitEvent('simulation_started', { massLeft, massRight, hasFriction });

    const animate = () => {
      vL *= (1 - friction);
      vR *= (1 - friction);
      pL += vL * 0.5;
      pR += vR * 0.5;

      setLeftPos(pL);
      setRightPos(pR);
      setLeftVel(vL);
      setRightVel(vR);

      if (Math.abs(vL) > 0.05 || Math.abs(vR) > 0.05) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setExperimentCount(prev => prev + 1);
        playSound('complete');
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isAnimating, isCompressed, massLeft, massRight, hasFriction, emitEvent, playSound]);

  const resetExperiment = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsCompressed(true);
    setIsAnimating(false);
    setLeftPos(0);
    setRightPos(0);
    setLeftVel(0);
    setRightVel(0);
    emitEvent('parameter_changed', { action: 'reset' });
  }, [emitEvent]);

  const handleTestAnswer = useCallback((answerIndex: number) => {
    if (answeredQuestions.has(currentQuestion)) return;
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
    const isCorrect = testQuestions[currentQuestion].options[answerIndex]?.correct;
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      playSound('success');
    } else {
      playSound('failure');
    }
    setAnsweredQuestions(prev => new Set([...prev, currentQuestion]));
    emitEvent('test_answered', { question: currentQuestion, answer: answerIndex, correct: isCorrect });
  }, [currentQuestion, answeredQuestions, emitEvent, testQuestions, playSound]);

  // Visualization
  const renderVisualization = () => {
    const trackY = 140;
    const centerX = 200;
    const cartWidth = 56;
    const cartHeight = 38;
    const leftCartX = centerX - 70 + leftPos * 3;
    const rightCartX = centerX + 14 + rightPos * 3;
    const springLen = isCompressed ? 24 : 60;

    const momentumLeft = massLeft * leftVel;
    const momentumRight = massRight * rightVel;
    const totalMomentum = momentumLeft + momentumRight;

    // Calculate positions for external labels
    const leftCartCenterX = ((leftCartX + cartWidth / 2) / 400) * 100;
    const rightCartCenterX = ((rightCartX + cartWidth / 2) / 400) * 100;

    return (
      <div className="relative">
        <svg width="100%" height="260" viewBox="0 0 400 260" className="block">
          <defs>
            {/* Premium 3D radial gradient for left cart (blue) */}
            <radialGradient id="momConCartBlue" cx="35%" cy="25%" r="70%" fx="25%" fy="15%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="20%" stopColor="#60a5fa" />
              <stop offset="45%" stopColor="#3b82f6" />
              <stop offset="70%" stopColor="#2563eb" />
              <stop offset="90%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </radialGradient>

            {/* Premium 3D radial gradient for right cart (orange) */}
            <radialGradient id="momConCartOrange" cx="35%" cy="25%" r="70%" fx="25%" fy="15%">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="20%" stopColor="#fdba74" />
              <stop offset="45%" stopColor="#fb923c" />
              <stop offset="70%" stopColor="#f97316" />
              <stop offset="90%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#c2410c" />
            </radialGradient>

            {/* Glowing gradient for left velocity arrow */}
            <linearGradient id="momConArrowBlue" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="25%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="75%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Glowing gradient for right velocity arrow */}
            <linearGradient id="momConArrowOrange" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c2410c" />
              <stop offset="25%" stopColor="#ea580c" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="75%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#fdba74" />
            </linearGradient>

            {/* Spring gradient */}
            <linearGradient id="momConSpring" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="30%" stopColor="#22c55e" />
              <stop offset="70%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>

            {/* Track gradient with enhanced depth */}
            <linearGradient id="momConTrack" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={hasFriction ? '#b8956a' : '#5a5a70'} />
              <stop offset="20%" stopColor={hasFriction ? '#a07a55' : '#4a4a5e'} />
              <stop offset="80%" stopColor={hasFriction ? '#8b6b4a' : '#3d3d50'} />
              <stop offset="100%" stopColor={hasFriction ? '#6b5030' : '#2d2d40'} />
            </linearGradient>

            {/* Wheel radial gradient */}
            <radialGradient id="momConWheel" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#4a4a5e" />
              <stop offset="40%" stopColor="#2a2a35" />
              <stop offset="80%" stopColor="#1a1a25" />
              <stop offset="100%" stopColor="#0f0f15" />
            </radialGradient>

            {/* Glow filter for arrows */}
            <filter id="momConArrowGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Glow filter for spring */}
            <filter id="momConSpringGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Cart shadow filter */}
            <filter id="momConCartShadow" x="-20%" y="-20%" width="140%" height="160%">
              <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
            </filter>

            {/* Impact burst filter */}
            <filter id="momConImpactGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Motion trail gradient for left cart */}
            <linearGradient id="momConTrailBlue" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>

            {/* Motion trail gradient for right cart */}
            <linearGradient id="momConTrailOrange" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#f97316" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect width="400" height="260" fill="#0f172a" />

          {/* Grid */}
          <pattern id="momConGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
          </pattern>
          <rect width="400" height="260" fill="url(#momConGrid)" />

          {/* Track */}
          <rect x={24} y={trackY + cartHeight + 8} width={352} height={14} rx={3} fill="url(#momConTrack)" />
          <rect x={24} y={trackY + cartHeight + 8} width={352} height={3} rx={1.5} fill="rgba(255,255,255,0.12)" />
          <rect x={24} y={trackY + cartHeight + 18} width={352} height={2} rx={1} fill="rgba(0,0,0,0.3)" />

          {/* Motion trails when moving */}
          {!isCompressed && Math.abs(leftVel) > 0.5 && (
            <rect
              x={leftCartX + cartWidth}
              y={trackY + 4}
              width={Math.min(60, Math.abs(leftPos) * 2)}
              height={cartHeight - 8}
              rx={4}
              fill="url(#momConTrailBlue)"
            />
          )}
          {!isCompressed && Math.abs(rightVel) > 0.5 && (
            <rect
              x={rightCartX - Math.min(60, Math.abs(rightPos) * 2)}
              y={trackY + 4}
              width={Math.min(60, Math.abs(rightPos) * 2)}
              height={cartHeight - 8}
              rx={4}
              fill="url(#momConTrailOrange)"
            />
          )}

          {/* Spring mechanism */}
          <g transform={`translate(${leftCartX + cartWidth}, ${trackY + cartHeight / 2})`}>
            {isCompressed ? (
              <g filter="url(#momConSpringGlow)">
                <path
                  d={`M0 0 ${Array.from({length: 8}, (_, i) => `L${3 + i * 3} ${i % 2 === 0 ? -6 : 6}`).join(' ')} L${springLen} 0`}
                  stroke="url(#momConSpring)" strokeWidth={4} fill="none" strokeLinecap="round"
                />
                {/* Spring energy glow */}
                <ellipse cx={springLen / 2} cy={0} rx={8} ry={10} fill="#22c55e" opacity={0.2}>
                  <animate attributeName="opacity" values="0.15;0.3;0.15" dur="0.6s" repeatCount="indefinite" />
                </ellipse>
                <circle cx={springLen / 2} cy={0} r={4} fill="#4ade80" opacity={0.8}>
                  <animate attributeName="r" values="3;5;3" dur="0.6s" repeatCount="indefinite" />
                </circle>
              </g>
            ) : (
              <line x1={0} y1={0} x2={Math.max(20, rightCartX - leftCartX - cartWidth - 8)} y2={0}
                    stroke="#22c55e" strokeWidth={2} strokeDasharray="6,4" opacity={0.3} />
            )}
          </g>

          {/* Impact effect when just released */}
          {!isCompressed && Math.abs(leftPos) < 5 && Math.abs(leftVel) > 2 && (
            <g transform={`translate(${centerX - 8}, ${trackY + cartHeight / 2})`} filter="url(#momConImpactGlow)">
              <circle r={12} fill="#4ade80" opacity={0.4}>
                <animate attributeName="r" values="8;20;8" dur="0.3s" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="0.3s" />
              </circle>
            </g>
          )}

          {/* Left Cart */}
          <g filter="url(#momConCartShadow)">
            {/* Cart body with 3D gradient */}
            <rect x={leftCartX} y={trackY} width={cartWidth} height={cartHeight} rx={6} fill="url(#momConCartBlue)" />
            {/* Top highlight */}
            <rect x={leftCartX + 4} y={trackY + 3} width={cartWidth - 8} height={6} rx={2} fill="rgba(255,255,255,0.25)" />
            {/* Side highlight */}
            <rect x={leftCartX + 2} y={trackY + 6} width={3} height={cartHeight - 12} rx={1.5} fill="rgba(255,255,255,0.15)" />
            {/* Bottom shadow */}
            <rect x={leftCartX + 4} y={trackY + cartHeight - 6} width={cartWidth - 8} height={4} rx={2} fill="rgba(0,0,0,0.2)" />
            {/* Mass label background */}
            <rect x={leftCartX + 8} y={trackY + 14} width={cartWidth - 16} height={18} rx={3} fill="rgba(0,0,0,0.25)" />
            <text x={leftCartX + cartWidth / 2} y={trackY + cartHeight / 2 + 5} textAnchor="middle"
                  fill="#fff" fontSize={14} fontWeight="700" fontFamily="system-ui" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              {massLeft} kg
            </text>
            {/* Wheels with 3D effect */}
            <circle cx={leftCartX + 14} cy={trackY + cartHeight + 5} r={8} fill="url(#momConWheel)" />
            <circle cx={leftCartX + 14} cy={trackY + cartHeight + 5} r={5} fill="#2a2a35" stroke="#4a4a5e" strokeWidth={1} />
            <circle cx={leftCartX + 14} cy={trackY + cartHeight + 3} r={2} fill="rgba(255,255,255,0.15)" />
            <circle cx={leftCartX + cartWidth - 14} cy={trackY + cartHeight + 5} r={8} fill="url(#momConWheel)" />
            <circle cx={leftCartX + cartWidth - 14} cy={trackY + cartHeight + 5} r={5} fill="#2a2a35" stroke="#4a4a5e" strokeWidth={1} />
            <circle cx={leftCartX + cartWidth - 14} cy={trackY + cartHeight + 3} r={2} fill="rgba(255,255,255,0.15)" />
          </g>

          {/* Right Cart */}
          <g filter="url(#momConCartShadow)">
            {/* Cart body with 3D gradient */}
            <rect x={rightCartX} y={trackY} width={cartWidth} height={cartHeight} rx={6} fill="url(#momConCartOrange)" />
            {/* Top highlight */}
            <rect x={rightCartX + 4} y={trackY + 3} width={cartWidth - 8} height={6} rx={2} fill="rgba(255,255,255,0.25)" />
            {/* Side highlight */}
            <rect x={rightCartX + 2} y={trackY + 6} width={3} height={cartHeight - 12} rx={1.5} fill="rgba(255,255,255,0.15)" />
            {/* Bottom shadow */}
            <rect x={rightCartX + 4} y={trackY + cartHeight - 6} width={cartWidth - 8} height={4} rx={2} fill="rgba(0,0,0,0.2)" />
            {/* Mass label background */}
            <rect x={rightCartX + 8} y={trackY + 14} width={cartWidth - 16} height={18} rx={3} fill="rgba(0,0,0,0.25)" />
            <text x={rightCartX + cartWidth / 2} y={trackY + cartHeight / 2 + 5} textAnchor="middle"
                  fill="#fff" fontSize={14} fontWeight="700" fontFamily="system-ui" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              {massRight} kg
            </text>
            {/* Wheels with 3D effect */}
            <circle cx={rightCartX + 14} cy={trackY + cartHeight + 5} r={8} fill="url(#momConWheel)" />
            <circle cx={rightCartX + 14} cy={trackY + cartHeight + 5} r={5} fill="#2a2a35" stroke="#4a4a5e" strokeWidth={1} />
            <circle cx={rightCartX + 14} cy={trackY + cartHeight + 3} r={2} fill="rgba(255,255,255,0.15)" />
            <circle cx={rightCartX + cartWidth - 14} cy={trackY + cartHeight + 5} r={8} fill="url(#momConWheel)" />
            <circle cx={rightCartX + cartWidth - 14} cy={trackY + cartHeight + 5} r={5} fill="#2a2a35" stroke="#4a4a5e" strokeWidth={1} />
            <circle cx={rightCartX + cartWidth - 14} cy={trackY + cartHeight + 3} r={2} fill="rgba(255,255,255,0.15)" />
          </g>

          {/* Velocity arrows with glow */}
          {!isCompressed && Math.abs(leftVel) > 0.1 && (
            <g transform={`translate(${leftCartX + cartWidth / 2}, ${trackY - 20})`} filter="url(#momConArrowGlow)">
              <line x1={0} y1={0} x2={leftVel * 6} y2={0} stroke="url(#momConArrowBlue)" strokeWidth={4} strokeLinecap="round" />
              <polygon points={`${leftVel * 6},0 ${leftVel * 6 + (leftVel > 0 ? -10 : 10)},-6 ${leftVel * 6 + (leftVel > 0 ? -10 : 10)},6`} fill="#60a5fa" />
            </g>
          )}
          {!isCompressed && Math.abs(rightVel) > 0.1 && (
            <g transform={`translate(${rightCartX + cartWidth / 2}, ${trackY - 20})`} filter="url(#momConArrowGlow)">
              <line x1={0} y1={0} x2={rightVel * 6} y2={0} stroke="url(#momConArrowOrange)" strokeWidth={4} strokeLinecap="round" />
              <polygon points={`${rightVel * 6},0 ${rightVel * 6 + (rightVel > 0 ? -10 : 10)},-6 ${rightVel * 6 + (rightVel > 0 ? -10 : 10)},6`} fill="#fdba74" />
            </g>
          )}

          {/* Momentum display removed - moved outside SVG */}

          {/* Total momentum badge with glow */}
          <g transform="translate(310, 15)">
            <rect x={0} y={0} width={75} height={32} rx={8}
                  fill={Math.abs(totalMomentum) < 0.5 ? 'rgba(34,197,94,0.2)' : '#1e293b'}
                  stroke={Math.abs(totalMomentum) < 0.5 ? '#22c55e' : '#334155'} strokeWidth={1.5} />
            {Math.abs(totalMomentum) < 0.5 && (
              <rect x={0} y={0} width={75} height={32} rx={8} fill="none" stroke="#22c55e" strokeWidth={1} opacity={0.5}>
                <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1.5s" repeatCount="indefinite" />
              </rect>
            )}
            <text x={37} y={14} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="system-ui">Total p</text>
            <text x={37} y={26} textAnchor="middle" fill={Math.abs(totalMomentum) < 0.5 ? '#4ade80' : '#f1f5f9'}
                  fontSize={12} fontWeight="700" fontFamily="monospace">
              {totalMomentum.toFixed(1)}
            </text>
          </g>
        </svg>

        {/* External velocity labels using typo system */}
        {!isCompressed && Math.abs(leftVel) > 0.1 && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${leftCartCenterX}%`,
              top: '28px',
              transform: 'translateX(-50%)',
              fontSize: typo.label,
            }}
          >
            <span className="text-blue-400 font-semibold bg-slate-900/80 px-2 py-0.5 rounded">
              v = {Math.abs(leftVel).toFixed(1)} m/s
            </span>
          </div>
        )}
        {!isCompressed && Math.abs(rightVel) > 0.1 && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${rightCartCenterX}%`,
              top: '28px',
              transform: 'translateX(-50%)',
              fontSize: typo.label,
            }}
          >
            <span className="text-orange-400 font-semibold bg-slate-900/80 px-2 py-0.5 rounded">
              v = {Math.abs(rightVel).toFixed(1)} m/s
            </span>
          </div>
        )}

        {/* Track label outside SVG */}
        <div
          className="absolute pointer-events-none text-slate-500"
          style={{
            right: '8px',
            bottom: '28px',
            fontSize: typo.label,
          }}
        >
          {hasFriction ? 'Carpet (friction)' : 'Frictionless track'}
        </div>

        {/* Momentum display outside SVG */}
        <div
          className="absolute left-4 pointer-events-none"
          style={{
            bottom: '8px',
            fontSize: typo.label,
          }}
        >
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">p = mv</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.abs(momentumLeft) * 10)}%`, marginLeft: momentumLeft < 0 ? 'auto' : 0 }}
                />
              </div>
              <span className="text-blue-400 font-mono font-semibold">p1={momentumLeft.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.abs(momentumRight) * 10)}%` }}
                />
              </div>
              <span className="text-orange-400 font-mono font-semibold">p2={momentumRight.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  // HOOK PHASE - Welcome page explaining momentum conservation
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-blue-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-orange-200 bg-clip-text text-transparent">
        Momentum Conservation
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-6">
        Discover one of physics most fundamental laws - the conservation of momentum!
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-orange-500/5 rounded-3xl" />
        <div className="relative">
          <div className="text-6xl mb-4">🛒💥🛒</div>
          <p className="text-xl text-white/90 font-medium leading-relaxed mb-4">
            Two carts connected by a compressed spring. When released, they push apart.
          </p>
          <p className="text-lg text-blue-300 font-semibold">
            "If one cart is heavier, which one moves faster?"
          </p>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 max-w-md w-full mb-8 border border-slate-700/50">
        <h3 className="text-white font-semibold mb-2">What You'll Learn:</h3>
        <ul className="text-left text-slate-300 space-y-1 text-sm">
          <li>• The momentum equation: p = mv</li>
          <li>• Why momentum is always conserved in isolated systems</li>
          <li>• How mass and velocity are inversely related in collisions</li>
          <li>• Real-world applications from rockets to billiards</li>
        </ul>
      </div>

      <button
        onClick={() => goToPhase('predict')}
        style={{ position: 'relative', zIndex: 10 }}
        className="group relative px-10 py-5 bg-gradient-to-r from-blue-500 to-orange-500 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Let's Find Out
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      <p className="mt-8 text-sm text-slate-500 tracking-wide">CONSERVATION OF MOMENTUM • p = mv</p>
    </div>
  );

  // PREDICT PHASE - Prediction question about collision outcomes
  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-2">Make Your Prediction</h2>
      <p className="text-slate-400 mb-8">A 1kg cart and 2kg cart are connected by a compressed spring. When released, which moves faster?</p>

      <div className="grid gap-3 w-full max-w-md">
        {[
          { id: 'heavy', label: 'The heavy cart (2kg) moves faster', icon: '🏋️' },
          { id: 'light', label: 'The light cart (1kg) moves faster', icon: '🪶' },
          { id: 'same', label: 'Both move at the same speed', icon: '⚖️' }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => { setPrediction(option.id); playSound('click'); emitEvent('prediction_made', { prediction: option.id }); }}
            style={{ position: 'relative', zIndex: 10 }}
            className={`p-4 rounded-xl text-left transition-all duration-300 flex items-center gap-4 ${
              prediction === option.id
                ? 'bg-blue-600/30 border-2 border-blue-400'
                : 'bg-slate-800/50 border-2 border-transparent hover:bg-slate-700/50'
            }`}
          >
            <span className="text-2xl">{option.icon}</span>
            <span className="text-white">{option.label}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <button
          onClick={() => goToPhase('play')}
          style={{ position: 'relative', zIndex: 10 }}
          className="mt-8 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
        >
          Test It! →
        </button>
      )}
    </div>
  );

  // PLAY PHASE - Interactive collision simulation
  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Momentum Lab</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-lg">
        {renderVisualization()}
      </div>

      <div className="flex gap-4 items-center mb-4 flex-wrap justify-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-blue-400 font-medium">Left:</span>
          {[1, 2, 3].map(m => (
            <button
              key={m}
              onClick={() => { setMassLeft(m); resetExperiment(); }}
              disabled={isAnimating}
              style={{ position: 'relative', zIndex: 10 }}
              className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${
                massLeft === m ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              } ${isAnimating ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {m}
            </button>
          ))}
        </div>
        <div className="w-px h-6 bg-slate-700" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-orange-400 font-medium">Right:</span>
          {[1, 2, 3].map(m => (
            <button
              key={m}
              onClick={() => { setMassRight(m); resetExperiment(); }}
              disabled={isAnimating}
              style={{ position: 'relative', zIndex: 10 }}
              className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${
                massRight === m ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              } ${isAnimating ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        {isCompressed ? (
          <button
            onClick={() => releaseCarts()}
            style={{ position: 'relative', zIndex: 10 }}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl"
            disabled={isAnimating}>
            🚀 Release Spring
          </button>
        ) : (
          <button
            onClick={() => resetExperiment()}
            style={{ position: 'relative', zIndex: 10 }}
            className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-xl">
            ↺ Reset
          </button>
        )}
      </div>

      <p className="text-sm text-slate-500 mb-4">Experiments: {experimentCount}</p>

      {experimentCount >= 2 && (
        <button
          onClick={() => goToPhase('review')}
          style={{ position: 'relative', zIndex: 10 }}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl">
          I see the pattern →
        </button>
      )}
    </div>
  );

  // REVIEW PHASE - Explain p = mv, momentum conservation equation
  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Momentum Conservation!</h2>

      <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6 max-w-lg mb-6">
        <p className="text-lg text-blue-400 font-semibold text-center mb-2">The Law of Conservation of Momentum</p>
        <p className="text-2xl text-white font-mono text-center mb-4">m₁v₁ + m₂v₂ = m₁v₁' + m₂v₂'</p>
        <p className="text-slate-300 text-center text-sm">Total momentum before = Total momentum after</p>
      </div>

      <div className="grid gap-4 max-w-lg w-full">
        <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-4">
          <p className="text-blue-400 font-semibold mb-1">Momentum Equation</p>
          <p className="text-white font-mono text-lg mb-2">p = mv</p>
          <p className="text-slate-300 text-sm">Momentum equals mass times velocity. Its a vector quantity with both magnitude and direction.</p>
        </div>
        <div className="bg-orange-600/20 border border-orange-500/30 rounded-xl p-4">
          <p className="text-orange-400 font-semibold mb-1">Key Insight</p>
          <p className="text-slate-300 text-sm">Starting at rest means zero total momentum. After the push, the momenta are equal and opposite. Lighter objects need higher velocity to have the same momentum!</p>
        </div>
        <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-emerald-400 font-semibold mb-1">The Math</p>
          <p className="text-slate-300 text-sm">If m₁ = 1kg and m₂ = 2kg, then v₁ = 2 × v₂. The lighter cart moves twice as fast!</p>
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-400">
        Your prediction: {prediction === 'light' ? '✅ Correct! The lighter cart moves faster.' : '🤔 Now you know - the lighter cart moves faster!'}
      </p>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{ position: 'relative', zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Ready for a Twist? →
      </button>
    </div>
  );

  // TWIST_PREDICT PHASE - Scenario about rocket propulsion
  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-2">Plot Twist: Rocket Science!</h2>
      <p className="text-slate-400 mb-4 text-center max-w-md">A rocket in space has no track to push against. How can it move forward?</p>

      <div className="bg-slate-800/50 rounded-xl p-4 max-w-md w-full mb-6">
        <div className="text-4xl text-center mb-3">🚀</div>
        <p className="text-slate-300 text-center text-sm">
          Think about what youve learned about momentum conservation. If a rocket expels exhaust gases backward...
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-md">
        {[
          { id: 'push_air', label: 'Rockets push against the air', icon: '💨' },
          { id: 'momentum', label: 'Exhaust goes back, rocket goes forward', icon: '⚡' },
          { id: 'magic', label: 'Rockets cant work in space', icon: '❌' }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => { setTwistPrediction(option.id); playSound('click'); emitEvent('twist_prediction_made', { twistPrediction: option.id }); }}
            style={{ position: 'relative', zIndex: 10 }}
            className={`p-4 rounded-xl text-left transition-all duration-300 flex items-center gap-4 ${
              twistPrediction === option.id
                ? 'bg-amber-600/30 border-2 border-amber-400'
                : 'bg-slate-800/50 border-2 border-transparent hover:bg-slate-700/50'
            }`}
          >
            <span className="text-2xl">{option.icon}</span>
            <span className="text-white">{option.label}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <button
          onClick={() => goToPhase('twist_play')}
          style={{ position: 'relative', zIndex: 10 }}
          className="mt-8 px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
        >
          See It In Action →
        </button>
      )}
    </div>
  );

  // TWIST_PLAY PHASE - Interactive rocket/explosion simulation
  const renderTwistPlay = () => {
    const [rocketPos, setRocketPos] = useState(200);
    const [exhaustParticles, setExhaustParticles] = useState<{id: number; x: number; y: number; vx: number}[]>([]);
    const [isFiring, setIsFiring] = useState(false);
    const rocketAnimRef = useRef<number>();

    const fireRocket = () => {
      if (isFiring) return;
      setIsFiring(true);

      let pos = rocketPos;
      const particles: {id: number; x: number; y: number; vx: number}[] = [];
      let particleId = 0;

      const animate = () => {
        // Move rocket forward (right)
        pos += 2;
        setRocketPos(pos);

        // Add exhaust particles going backward (left)
        if (Math.random() > 0.3) {
          particles.push({
            id: particleId++,
            x: pos - 30,
            y: 130 + (Math.random() - 0.5) * 20,
            vx: -8 - Math.random() * 4
          });
        }

        // Move existing particles
        particles.forEach(p => { p.x += p.vx; });

        // Remove old particles
        const activeParticles = particles.filter(p => p.x > 0);
        setExhaustParticles([...activeParticles]);

        if (pos < 350) {
          rocketAnimRef.current = requestAnimationFrame(animate);
        } else {
          setIsFiring(false);
          playSound('complete');
        }
      };

      rocketAnimRef.current = requestAnimationFrame(animate);
    };

    const resetRocket = () => {
      if (rocketAnimRef.current) cancelAnimationFrame(rocketAnimRef.current);
      setRocketPos(200);
      setExhaustParticles([]);
      setIsFiring(false);
    };

    useEffect(() => {
      return () => {
        if (rocketAnimRef.current) cancelAnimationFrame(rocketAnimRef.current);
      };
    }, []);

    // Fixed star positions to avoid re-randomization on re-render
    const starPositions = React.useMemo(() =>
      [...Array(40)].map((_, i) => ({
        cx: (i * 37 + 13) % 400,
        cy: (i * 23 + 7) % 260,
        r: 0.5 + (i % 3) * 0.5,
        opacity: 0.3 + (i % 5) * 0.15
      })), []
    );

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-amber-400 mb-4">Rocket Propulsion Lab</h2>

        <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-lg relative">
          <svg width="100%" height="260" viewBox="0 0 400 260" className="block">
            <defs>
              {/* Premium rocket body gradient */}
              <radialGradient id="momConRocketBody" cx="40%" cy="30%" r="70%" fx="30%" fy="20%">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="25%" stopColor="#60a5fa" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="75%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#1e40af" />
              </radialGradient>

              {/* Rocket nose gradient */}
              <linearGradient id="momConRocketNose" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="50%" stopColor="#93c5fd" />
                <stop offset="100%" stopColor="#bfdbfe" />
              </linearGradient>

              {/* Rocket tail/fin gradient */}
              <linearGradient id="momConRocketTail" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#1e40af" />
                <stop offset="50%" stopColor="#1d4ed8" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>

              {/* Window gradient */}
              <radialGradient id="momConWindow" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#7dd3fc" />
                <stop offset="40%" stopColor="#38bdf8" />
                <stop offset="80%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#0284c7" />
              </radialGradient>

              {/* Flame gradient - outer */}
              <radialGradient id="momConFlameOuter" cx="80%" cy="50%" r="80%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="30%" stopColor="#f97316" />
                <stop offset="60%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#c2410c" stopOpacity="0.5" />
              </radialGradient>

              {/* Flame gradient - inner */}
              <radialGradient id="momConFlameInner" cx="80%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="30%" stopColor="#fde68a" />
                <stop offset="60%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f97316" />
              </radialGradient>

              {/* Exhaust particle gradient */}
              <radialGradient id="momConExhaust" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="40%" stopColor="#f97316" />
                <stop offset="80%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#c2410c" stopOpacity="0" />
              </radialGradient>

              {/* Momentum arrow gradients */}
              <linearGradient id="momConRocketArrowExhaust" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#fdba74" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>

              <linearGradient id="momConRocketArrowForward" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#93c5fd" />
              </linearGradient>

              {/* Glow filters */}
              <filter id="momConRocketGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              <filter id="momConFlameGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              <filter id="momConExhaustGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              <filter id="momConStarGlow" x="-200%" y="-200%" width="500%" height="500%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Space background gradient */}
              <radialGradient id="momConSpaceBg" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="50%" stopColor="#0a0f1a" />
                <stop offset="100%" stopColor="#020617" />
              </radialGradient>
            </defs>

            {/* Space background */}
            <rect width="400" height="260" fill="url(#momConSpaceBg)" />

            {/* Stars with glow */}
            {starPositions.map((star, i) => (
              <circle
                key={i}
                cx={star.cx}
                cy={star.cy}
                r={star.r}
                fill="#fff"
                opacity={star.opacity}
                filter={i % 5 === 0 ? "url(#momConStarGlow)" : undefined}
              />
            ))}

            {/* Distant nebula effect */}
            <ellipse cx={320} cy={60} rx={50} ry={30} fill="#3b82f6" opacity={0.05} />
            <ellipse cx={80} cy={200} rx={40} ry={25} fill="#f97316" opacity={0.04} />

            {/* Exhaust particles with premium glow */}
            {exhaustParticles.map(p => (
              <g key={p.id} filter="url(#momConExhaustGlow)">
                <circle cx={p.x} cy={p.y} r={6} fill="url(#momConExhaust)" opacity={0.9}>
                  <animate attributeName="opacity" from="0.9" to="0" dur="0.6s" />
                  <animate attributeName="r" from="6" to="3" dur="0.6s" />
                </circle>
              </g>
            ))}

            {/* Rocket with premium styling */}
            <g transform={`translate(${rocketPos}, 130)`} filter="url(#momConRocketGlow)">
              {/* Engine glow when firing */}
              {isFiring && (
                <ellipse cx={-25} cy={0} rx={8} ry={12} fill="#f97316" opacity={0.3}>
                  <animate attributeName="opacity" values="0.2;0.4;0.2" dur="0.15s" repeatCount="indefinite" />
                </ellipse>
              )}

              {/* Tail fins with 3D effect */}
              <polygon points="-25,-10 -38,-22 -25,-5" fill="url(#momConRocketTail)" />
              <polygon points="-25,-10 -38,-22 -32,-16" fill="rgba(255,255,255,0.1)" />
              <polygon points="-25,10 -38,22 -25,5" fill="url(#momConRocketTail)" />
              <polygon points="-25,5 -38,22 -32,16" fill="rgba(0,0,0,0.2)" />

              {/* Main body with 3D gradient */}
              <ellipse cx={0} cy={0} rx={28} ry={16} fill="url(#momConRocketBody)" />
              {/* Body highlight */}
              <ellipse cx={-5} cy={-6} rx={18} ry={5} fill="rgba(255,255,255,0.15)" />
              {/* Body shadow */}
              <ellipse cx={0} cy={8} rx={20} ry={4} fill="rgba(0,0,0,0.2)" />

              {/* Nose cone with highlight */}
              <polygon points="28,0 45,-10 45,10" fill="url(#momConRocketNose)" />
              <polygon points="28,-3 45,-10 45,-2" fill="rgba(255,255,255,0.3)" />

              {/* Window with 3D effect */}
              <circle cx={10} cy={0} r={7} fill="#0c4a6e" />
              <circle cx={10} cy={0} r={6} fill="url(#momConWindow)" />
              <ellipse cx={8} cy={-2} rx={3} ry={2} fill="rgba(255,255,255,0.4)" />

              {/* Premium flame when firing */}
              {isFiring && (
                <g transform="translate(-30, 0)" filter="url(#momConFlameGlow)">
                  {/* Outer flame */}
                  <ellipse cx={-5} cy={0} rx={22} ry={10} fill="url(#momConFlameOuter)">
                    <animate attributeName="rx" values="18;25;18" dur="0.08s" repeatCount="indefinite" />
                    <animate attributeName="ry" values="9;12;9" dur="0.1s" repeatCount="indefinite" />
                  </ellipse>
                  {/* Middle flame */}
                  <ellipse cx={0} cy={0} rx={14} ry={7} fill="url(#momConFlameInner)">
                    <animate attributeName="rx" values="12;16;12" dur="0.07s" repeatCount="indefinite" />
                  </ellipse>
                  {/* Inner core */}
                  <ellipse cx={3} cy={0} rx={6} ry={3} fill="#fef3c7">
                    <animate attributeName="rx" values="5;8;5" dur="0.06s" repeatCount="indefinite" />
                  </ellipse>
                </g>
              )}
            </g>

            {/* Premium momentum arrows */}
            {isFiring && (
              <>
                <g transform={`translate(${rocketPos - 65}, 190)`} filter="url(#momConRocketGlow)">
                  <line x1={0} y1={0} x2={-45} y2={0} stroke="url(#momConRocketArrowExhaust)" strokeWidth={4} strokeLinecap="round" />
                  <polygon points="-45,0 -35,-7 -35,7" fill="#fdba74" />
                </g>
                <g transform={`translate(${rocketPos + 50}, 190)`} filter="url(#momConRocketGlow)">
                  <line x1={0} y1={0} x2={45} y2={0} stroke="url(#momConRocketArrowForward)" strokeWidth={4} strokeLinecap="round" />
                  <polygon points="45,0 35,-7 35,7" fill="#93c5fd" />
                </g>
              </>
            )}
          </svg>

          {/* External labels using typo system */}
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{ fontSize: typo.label }}
          >
            <span className="text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full">
              Exhaust goes LEFT  |  Rocket goes RIGHT
            </span>
          </div>

          {/* Momentum labels */}
          {isFiring && (
            <>
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${((rocketPos - 85) / 400) * 100}%`,
                  bottom: '20px',
                  fontSize: typo.label,
                }}
              >
                <span className="text-orange-400 font-semibold bg-slate-900/80 px-2 py-0.5 rounded">
                  p exhaust
                </span>
              </div>
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${((rocketPos + 70) / 400) * 100}%`,
                  bottom: '20px',
                  fontSize: typo.label,
                }}
              >
                <span className="text-blue-400 font-semibold bg-slate-900/80 px-2 py-0.5 rounded">
                  p rocket
                </span>
              </div>
            </>
          )}

          {/* Conservation badge */}
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{ fontSize: typo.label }}
          >
            <span className="text-emerald-400 bg-emerald-900/30 border border-emerald-500/30 px-3 py-1 rounded-full font-medium">
              Total momentum = 0 (conserved!)
            </span>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <button
            onClick={fireRocket}
            style={{ position: 'relative', zIndex: 10 }}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl"
            disabled={isFiring}>
            🚀 Fire Thrusters!
          </button>
          <button
            onClick={resetRocket}
            style={{ position: 'relative', zIndex: 10 }}
            className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-xl">
            ↺ Reset
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-4 text-center max-w-md">
          Watch how the rocket gains forward momentum by expelling exhaust backward. The momenta are equal and opposite!
        </p>

        <button
          onClick={() => goToPhase('twist_review')}
          style={{ position: 'relative', zIndex: 10 }}
          className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
          I understand now →
        </button>
      </div>
    );
  };

  // TWIST_REVIEW PHASE - Explain how rockets use momentum conservation
  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Rockets & Momentum</h2>

      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-lg mb-6">
        <p className="text-lg text-amber-400 font-semibold text-center mb-2">Rockets Work By Conservation of Momentum!</p>
        <p className="text-slate-300 text-center">
          A rocket doesn't need anything to push against. It works by throwing mass (exhaust) backward at high speed, gaining equal momentum forward.
        </p>
      </div>

      <div className="grid gap-4 max-w-lg w-full">
        <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-4">
          <p className="text-blue-400 font-semibold mb-1">The Rocket Equation</p>
          <p className="text-white font-mono mb-2">F = Δp/Δt = ṁ × vₑ</p>
          <p className="text-slate-300 text-sm">Thrust equals mass flow rate times exhaust velocity. Faster exhaust = more thrust!</p>
        </div>
        <div className="bg-orange-600/20 border border-orange-500/30 rounded-xl p-4">
          <p className="text-orange-400 font-semibold mb-1">Why It Works in Space</p>
          <p className="text-slate-300 text-sm">
            Rockets don't push against air - they push against their own exhaust! This is why they work perfectly in the vacuum of space.
          </p>
        </div>
        <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-emerald-400 font-semibold mb-1">Real Numbers</p>
          <p className="text-slate-300 text-sm">
            The Saturn V rocket expelled 15 tons of fuel per second at 2,500 m/s to generate 35 million Newtons of thrust!
          </p>
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-400">
        Your prediction: {twistPrediction === 'momentum' ? '✅ Exactly right!' : '🤔 Now you understand how rockets really work!'}
      </p>

      <button
        onClick={() => goToPhase('transfer')}
        style={{ position: 'relative', zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl">
        See More Examples →
      </button>
    </div>
  );

  // TRANSFER PHASE - 4 real-world applications
  const renderTransfer = () => {
    const app = applications[activeApp];
    const allAppsCompleted = completedApps.size === applications.length;

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Real-World Applications</h2>
        <p className="text-slate-400 mb-4 text-center">Momentum conservation is everywhere!</p>

        <div className="flex gap-2 mb-4 flex-wrap justify-center">
          {applications.map((_, idx) => (
            <div key={idx} className={`w-3 h-3 rounded-full ${completedApps.has(idx) ? 'bg-emerald-500' : idx === activeApp ? 'bg-blue-500' : 'bg-slate-700'}`} />
          ))}
        </div>

        <div className="flex gap-2 mb-4 flex-wrap justify-center">
          {applications.map((a, idx) => (
            <button
              key={a.id}
              onClick={() => setActiveApp(idx)}
              disabled={idx > 0 && !completedApps.has(idx - 1)}
              style={{ position: 'relative', zIndex: 10 }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeApp === idx ? 'bg-blue-600 text-white'
                : completedApps.has(idx) ? 'bg-emerald-600/30 text-emerald-400'
                : idx > 0 && !completedApps.has(idx - 1) ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {a.title.split(' ')[0]}
            </button>
          ))}
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-lg w-full">
          <h3 className="text-xl font-bold mb-3" style={{ color: app.color }}>{app.title}</h3>
          <p className="text-slate-300 mb-4">{app.description}</p>
          <div className="flex gap-3 mb-4">
            <div className="bg-slate-700/50 rounded-lg p-3 flex-1 text-center">
              <p className="text-xs text-slate-500">Formula</p>
              <p className="text-sm text-white font-mono">{app.formula}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 flex-1 text-center">
              <p className="text-xs text-slate-500">Real Data</p>
              <p className="text-sm text-white">{app.stat}</p>
            </div>
          </div>

          {!completedApps.has(activeApp) && (
            <button
              onClick={() => {
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
                playSound('complete');
                emitEvent('app_explored', { app: app.id });
                if (activeApp < applications.length - 1) {
                  setTimeout(() => setActiveApp(activeApp + 1), 300);
                }
              }}
              style={{ position: 'relative', zIndex: 10 }}
              className="w-full py-3 bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 font-medium rounded-xl"
            >
              ✓ Mark as Read
            </button>
          )}
        </div>

        {allAppsCompleted && (
          <button
            onClick={() => goToPhase('test')}
            style={{ position: 'relative', zIndex: 10 }}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl">
            Take the Quiz →
          </button>
        )}
      </div>
    );
  };

  // TEST PHASE - 10 multiple choice questions
  const renderTest = () => {
    const q = testQuestions[currentQuestion];
    const isAnswered = answeredQuestions.has(currentQuestion);

    return (
      <div className="flex flex-col items-center p-6">
        <div className="flex justify-between items-center w-full max-w-lg mb-4">
          <span className="text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
            Question {currentQuestion + 1} of {testQuestions.length}
          </span>
          <span className="text-sm text-emerald-400 bg-emerald-600/20 px-3 py-1 rounded-full font-medium">
            Score: {correctAnswers}/{answeredQuestions.size}
          </span>
        </div>

        <div className="h-1 bg-slate-800 rounded-full w-full max-w-lg mb-6 overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${((currentQuestion + 1) / testQuestions.length) * 100}%` }} />
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-lg w-full">
          <h3 className="text-lg text-white font-medium mb-4">{q.question}</h3>

          <div className="grid gap-3">
            {q.options.map((option, idx) => {
              let bgClass = 'bg-slate-700/50 hover:bg-slate-600/50';
              if (isAnswered) {
                if (option.correct) bgClass = 'bg-emerald-600/30 border-emerald-500';
                else if (idx === selectedAnswer) bgClass = 'bg-red-600/30 border-red-500';
              }
              return (
                <button
                  key={idx}
                  onClick={() => handleTestAnswer(idx)}
                  disabled={isAnswered}
                  style={{ position: 'relative', zIndex: 10 }}
                  className={`p-4 rounded-xl text-left border-2 transition-all ${bgClass} ${isAnswered ? 'cursor-default' : ''}`}
                >
                  <span className="text-slate-200">{option.text}</span>
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div className="mt-4 p-4 bg-blue-600/20 border border-blue-500/30 rounded-xl">
              <p className="text-slate-300 text-sm">💡 {q.explanation}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between w-full max-w-lg mt-6">
          <button
            onClick={() => { setCurrentQuestion(prev => Math.max(0, prev - 1)); setSelectedAnswer(null); setShowExplanation(answeredQuestions.has(currentQuestion - 1)); }}
            disabled={currentQuestion === 0}
            style={{ position: 'relative', zIndex: 10 }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50"
          >
            ← Back
          </button>

          {currentQuestion < testQuestions.length - 1 ? (
            <button
              onClick={() => { setCurrentQuestion(prev => prev + 1); setSelectedAnswer(null); setShowExplanation(answeredQuestions.has(currentQuestion + 1)); }}
              style={{ position: 'relative', zIndex: 10 }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
            >
              Next →
            </button>
          ) : answeredQuestions.size === testQuestions.length ? (
            <button
              onClick={() => {
                const score = Math.round((correctAnswers / testQuestions.length) * 100);
                setTestScore?.(score);
                emitEvent('test_completed', { score, correct: correctAnswers, total: testQuestions.length });
                goToPhase('mastery');
              }}
              style={{ position: 'relative', zIndex: 10 }}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg"
            >
              Complete →
            </button>
          ) : (
            <span className="text-sm text-slate-500 self-center">Answer all to continue</span>
          )}
        </div>
      </div>
    );
  };

  // MASTERY PHASE - Congratulations page
  const renderMastery = () => {
    const percentage = Math.round((correctAnswers / testQuestions.length) * 100);
    const passed = correctAnswers >= 7;

    const resetGame = () => {
      setPhase('hook');
      setExperimentCount(0);
      setCurrentQuestion(0);
      setCorrectAnswers(0);
      setAnsweredQuestions(new Set());
      setPrediction(null);
      setTwistPrediction(null);
      setMassLeft(1);
      setMassRight(2);
      setHasFriction(false);
      setActiveApp(0);
      setCompletedApps(new Set());
      resetExperiment();
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] p-6 text-center relative overflow-hidden">
        {/* Confetti effect for passing */}
        {passed && (
          <>
            <style>{`
              @keyframes confettiFall {
                0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
                100% { transform: translateY(600px) rotate(720deg); opacity: 0; }
              }
            `}</style>
            {[...Array(20)].map((_, i) => (
              <div key={i} style={{
                position: 'absolute', left: `${Math.random() * 100}%`, top: '-20px',
                animation: `confettiFall ${2 + Math.random() * 2}s linear ${Math.random() * 2}s forwards`,
                pointerEvents: 'none', fontSize: 18,
              }}>
                {['🚀', '⭐', '✨', '🎉', '🛒'][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </>
        )}

        <div className="text-7xl mb-6">{passed ? '🏆' : '📚'}</div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {passed ? 'Congratulations! Momentum Master!' : 'Keep Practicing!'}
        </h1>
        <div className={`text-5xl font-bold mb-2 ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>{percentage}%</div>
        <p className="text-slate-400 mb-8">{correctAnswers}/{testQuestions.length} correct answers</p>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-md w-full mb-8 border border-slate-700/50">
          <h3 className="text-lg font-bold text-blue-400 mb-4">{passed ? 'Concepts Mastered' : 'Key Concepts to Review'}</h3>
          <ul className="text-left space-y-2">
            {['Momentum p = mass × velocity', 'Total momentum is always conserved', 'Lighter objects move faster in push-offs', 'Rockets use momentum conservation'].map((item, idx) => (
              <li key={idx} className="flex items-center gap-2 text-slate-300">
                <span className="text-emerald-400">{passed ? '✓' : '○'}</span> {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-md">
          {passed ? (
            <>
              <button
                onClick={() => handleReturnToDashboard()}
                style={{ position: 'relative', zIndex: 10 }}
                className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
              >
                🏠 Return to Dashboard
              </button>
              <button
                onClick={() => resetGame()}
                style={{ position: 'relative', zIndex: 10 }}
                className="w-full px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl border border-slate-600"
              >
                🔬 Review Lesson
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setCurrentQuestion(0);
                  setCorrectAnswers(0);
                  setAnsweredQuestions(new Set());
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                  goToPhase('test');
                }}
                style={{ position: 'relative', zIndex: 10 }}
                className="w-full px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl"
              >
                ↻ Retake Test
              </button>
              <button
                onClick={() => resetGame()}
                style={{ position: 'relative', zIndex: 10 }}
                className="w-full px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl border border-slate-600"
              >
                🔬 Review Lesson
              </button>
              <button
                onClick={() => handleReturnToDashboard()}
                style={{ position: 'relative', zIndex: 10 }}
                className="text-slate-500 underline text-sm mt-2"
              >
                Return to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // Phase renderer
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
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Momentum Conservation</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ position: 'relative', zIndex: 10 }}
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

export default MomentumConservationRenderer;
