import React, { useState, useEffect, useCallback, useRef } from 'react';

// Phase type for 10-phase learning structure
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

// Gold standard types
type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'spin_changed'
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
  onPhaseComplete?: (phase: string) => void;
  setTestScore?: (score: number) => void;
}

const MagnusEffectRenderer: React.FC<Props> = ({ onGameEvent, gamePhase, onPhaseComplete, setTestScore }) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Animation states for Magnus effect
  const [ballX, setBallX] = useState(50);
  const [ballY, setBallY] = useState(150);
  const [spinRate, setSpinRate] = useState(50);
  const [ballSpeed, setBallSpeed] = useState(50);
  const [spinDirection, setSpinDirection] = useState<'topspin' | 'backspin' | 'sidespin'>('topspin');
  const [isAnimating, setIsAnimating] = useState(false);
  const [ballRotation, setBallRotation] = useState(0);
  const [trajectory, setTrajectory] = useState<{x: number, y: number}[]>([]);

  const lastClickRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Responsive check
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
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Web Audio API sound system
  const playSound = useCallback((soundType: 'click' | 'correct' | 'incorrect' | 'complete' | 'transition' | 'whoosh') => {
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
        case 'transition':
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
        case 'whoosh':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(800, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
      }
    } catch {
      // Audio not available
    }
  }, []);

  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
  }, [playSound, onPhaseComplete, onGameEvent]);

  // Ball flight animation with Magnus effect
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setBallX(prev => {
        const newX = prev + ballSpeed / 10;
        if (newX > 380) {
          setIsAnimating(false);
          return 50;
        }
        return newX;
      });

      setBallY(prev => {
        // Magnus force creates curve
        const magnusForce = (spinRate / 100) * (spinDirection === 'topspin' ? 0.8 : spinDirection === 'backspin' ? -0.8 : 0);
        const gravity = 0.15;
        const newY = prev + magnusForce + gravity;
        return Math.max(30, Math.min(280, newY));
      });

      setBallRotation(prev => prev + spinRate / 5);

      setTrajectory(prev => {
        const newTraj = [...prev, { x: ballX, y: ballY }];
        if (newTraj.length > 50) newTraj.shift();
        return newTraj;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [isAnimating, ballSpeed, spinRate, spinDirection, ballX, ballY]);

  useEffect(() => {
    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', data: { phase } });
    }
  }, [phase, onGameEvent]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'B' } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'C' } });
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    onGameEvent?.({ type: 'test_answered', data: { questionIndex, answerIndex } });
  }, [onGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'app_explored', data: { appIndex } });
  }, [playSound, onGameEvent]);

  const startAnimation = useCallback(() => {
    setBallX(50);
    setBallY(150);
    setTrajectory([]);
    setIsAnimating(true);
    onGameEvent?.({ type: 'simulation_started', data: { spinRate, ballSpeed, spinDirection } });
  }, [onGameEvent, spinRate, ballSpeed, spinDirection]);

  const testQuestions = [
    {
      question: "What causes the Magnus effect?",
      options: [
        { text: "Gravity acting on spin", correct: false },
        { text: "Pressure difference from air speed variation", correct: true },
        { text: "Magnetic forces", correct: false },
        { text: "Wind resistance only", correct: false }
      ]
    },
    {
      question: "A ball with topspin will curve:",
      options: [
        { text: "Upward", correct: false },
        { text: "Downward", correct: true },
        { text: "Left only", correct: false },
        { text: "It won't curve", correct: false }
      ]
    },
    {
      question: "On which side of a spinning ball is air pressure lower?",
      options: [
        { text: "The side spinning into the airflow", correct: false },
        { text: "The side spinning with the airflow", correct: true },
        { text: "Both sides equal", correct: false },
        { text: "Pressure doesn't change", correct: false }
      ]
    },
    {
      question: "The Magnus force is perpendicular to:",
      options: [
        { text: "Gravity only", correct: false },
        { text: "Both velocity and spin axis", correct: true },
        { text: "The ground", correct: false },
        { text: "Nothing - it acts in all directions", correct: false }
      ]
    },
    {
      question: "Why do golf balls have dimples?",
      options: [
        { text: "Decoration only", correct: false },
        { text: "To increase drag", correct: false },
        { text: "To enhance the Magnus effect and reduce drag", correct: true },
        { text: "To make them heavier", correct: false }
      ]
    },
    {
      question: "A curveball in baseball uses:",
      options: [
        { text: "Only gravity", correct: false },
        { text: "The Magnus effect from spin", correct: true },
        { text: "Air temperature changes", correct: false },
        { text: "The weight of the ball", correct: false }
      ]
    },
    {
      question: "Increasing spin rate will:",
      options: [
        { text: "Decrease the curve", correct: false },
        { text: "Have no effect", correct: false },
        { text: "Increase the curve", correct: true },
        { text: "Make the ball go straight", correct: false }
      ]
    },
    {
      question: "The Magnus force equation F = CL x (1/2)pv^2A shows force depends on:",
      options: [
        { text: "Only ball size", correct: false },
        { text: "Velocity squared", correct: true },
        { text: "Temperature only", correct: false },
        { text: "Color of ball", correct: false }
      ]
    },
    {
      question: "Backspin on a tennis ball causes it to:",
      options: [
        { text: "Drop faster", correct: false },
        { text: "Stay in the air longer", correct: true },
        { text: "Curve left", correct: false },
        { text: "Stop spinning", correct: false }
      ]
    },
    {
      question: "The Magnus effect also works:",
      options: [
        { text: "Only in air", correct: false },
        { text: "Only in water", correct: false },
        { text: "In any fluid (air, water, etc.)", correct: true },
        { text: "Only in a vacuum", correct: false }
      ]
    }
  ];

  const calculateScore = useCallback(() => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  }, [testAnswers]);

  const renderSpinningBall = (size: number = 60, showAirflow: boolean = false) => {
    return (
      <svg width="400" height="320" className="mx-auto">
        <defs>
          {/* === PREMIUM BACKGROUND GRADIENTS === */}
          {/* Sky gradient with atmospheric depth */}
          <linearGradient id="magnSkyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0c1929" />
            <stop offset="25%" stopColor="#1e3a5f" />
            <stop offset="50%" stopColor="#1a4a6e" />
            <stop offset="75%" stopColor="#0f2a4a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Lab environment gradient */}
          <linearGradient id="magnLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="30%" stopColor="#0a1628" />
            <stop offset="70%" stopColor="#0f1d32" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* === 3D SPINNING BALL GRADIENTS === */}
          {/* Baseball/ball primary radial gradient for 3D effect */}
          <radialGradient id="magnBall3D" cx="35%" cy="25%" r="65%" fx="30%" fy="20%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="15%" stopColor="#fef2f2" />
            <stop offset="35%" stopColor="#fca5a5" />
            <stop offset="60%" stopColor="#ef4444" />
            <stop offset="85%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#991b1b" />
          </radialGradient>

          {/* Ball shadow gradient for depth */}
          <radialGradient id="magnBallShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0" />
            <stop offset="70%" stopColor="#000000" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
          </radialGradient>

          {/* Ball specular highlight */}
          <radialGradient id="magnBallHighlight" cx="30%" cy="25%" r="40%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          {/* === AIRFLOW GRADIENTS === */}
          {/* Fast airflow (low pressure - blue) */}
          <linearGradient id="magnFastAirflow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
            <stop offset="20%" stopColor="#60a5fa" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.9" />
            <stop offset="80%" stopColor="#60a5fa" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
          </linearGradient>

          {/* Slow airflow (high pressure - red/orange) */}
          <linearGradient id="magnSlowAirflow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.1" />
            <stop offset="20%" stopColor="#f87171" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#fca5a5" stopOpacity="0.8" />
            <stop offset="80%" stopColor="#f87171" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
          </linearGradient>

          {/* === FORCE ARROW GRADIENTS === */}
          {/* Magnus force arrow gradient (green) */}
          <linearGradient id="magnForceArrow" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#166534" />
            <stop offset="30%" stopColor="#22c55e" />
            <stop offset="70%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#86efac" />
          </linearGradient>

          {/* Spin indicator gradient (gold) */}
          <linearGradient id="magnSpinIndicator" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
          </linearGradient>

          {/* === PRESSURE ZONE GRADIENTS === */}
          {/* Low pressure zone (blue glow) */}
          <radialGradient id="magnLowPressure" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#1d4ed8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
          </radialGradient>

          {/* High pressure zone (red glow) */}
          <radialGradient id="magnHighPressure" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#dc2626" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
          </radialGradient>

          {/* Target zone gradient */}
          <linearGradient id="magnTargetZone" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#4ade80" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.1" />
          </linearGradient>

          {/* Trajectory trail gradient */}
          <linearGradient id="magnTrajectory" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.2" />
          </linearGradient>

          {/* === GLOW FILTERS === */}
          {/* Ball glow filter */}
          <filter id="magnBallGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Force arrow glow filter */}
          <filter id="magnForceGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Soft airflow glow */}
          <filter id="magnAirflowGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Spin indicator glow */}
          <filter id="magnSpinGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Text shadow filter */}
          <filter id="magnTextShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.5" />
          </filter>

          {/* === ARROW MARKERS === */}
          {/* Magnus force arrow marker (large, green) */}
          <marker id="magnArrowForce" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">
            <path d="M0,0 L0,8 L12,4 z" fill="url(#magnForceArrow)" />
          </marker>

          {/* Spin direction arrow marker (gold) */}
          <marker id="magnArrowSpin" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#fbbf24" />
          </marker>

          {/* Airflow arrow marker (blue) */}
          <marker id="magnArrowAirFast" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#60a5fa" />
          </marker>

          {/* Airflow arrow marker (red) */}
          <marker id="magnArrowAirSlow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#f87171" />
          </marker>

          {/* === PATTERNS === */}
          {/* Subtle grid pattern for lab environment */}
          <pattern id="magnLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e3a5f" strokeWidth="0.3" strokeOpacity="0.3" />
          </pattern>
        </defs>

        {/* === BACKGROUND LAYERS === */}
        <rect width="400" height="320" fill="url(#magnLabBg)" rx="12" />
        <rect width="400" height="320" fill="url(#magnSkyGradient)" opacity="0.6" rx="12" />
        <rect width="400" height="320" fill="url(#magnLabGrid)" rx="12" />

        {/* === TRAJECTORY TRAIL === */}
        {trajectory.length > 1 && (
          <g>
            <path
              d={`M ${trajectory.map((p) => `${p.x} ${p.y}`).join(' L ')}`}
              fill="none"
              stroke="url(#magnTrajectory)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />
            {/* Trajectory glow */}
            <path
              d={`M ${trajectory.map((p) => `${p.x} ${p.y}`).join(' L ')}`}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.2"
            />
          </g>
        )}

        {/* === AIRFLOW VISUALIZATION === */}
        {showAirflow && (
          <g>
            {/* Pressure zones */}
            <ellipse cx="200" cy="100" rx="80" ry="40" fill="url(#magnLowPressure)" />
            <ellipse cx="200" cy="200" rx="80" ry="40" fill="url(#magnHighPressure)" />

            {/* Fast airflow streamlines (top - low pressure) */}
            <g filter="url(#magnAirflowGlow)">
              {[0, 1, 2].map((i) => (
                <path
                  key={`fast-${i}`}
                  d={`M${60 + i * 20},${110 + i * 8} Q200,${85 + i * 5} ${340 - i * 20},${110 + i * 8}`}
                  fill="none"
                  stroke="url(#magnFastAirflow)"
                  strokeWidth={3 - i * 0.5}
                  strokeLinecap="round"
                  markerEnd="url(#magnArrowAirFast)"
                >
                  <animate attributeName="stroke-dashoffset" from="40" to="0" dur={`${0.4 + i * 0.1}s`} repeatCount="indefinite" />
                </path>
              ))}
            </g>

            {/* Slow airflow streamlines (bottom - high pressure) */}
            <g filter="url(#magnAirflowGlow)">
              {[0, 1, 2].map((i) => (
                <path
                  key={`slow-${i}`}
                  d={`M${60 + i * 20},${190 - i * 8} Q200,${215 - i * 5} ${340 - i * 20},${190 - i * 8}`}
                  fill="none"
                  stroke="url(#magnSlowAirflow)"
                  strokeWidth={3 - i * 0.5}
                  strokeLinecap="round"
                  strokeDasharray="8,4"
                  markerEnd="url(#magnArrowAirSlow)"
                >
                  <animate attributeName="stroke-dashoffset" from="0" to="24" dur={`${0.8 + i * 0.2}s`} repeatCount="indefinite" />
                </path>
              ))}
            </g>

            {/* Pressure labels with premium styling */}
            <g filter="url(#magnTextShadow)">
              <rect x="140" y="70" width="120" height="22" rx="4" fill="#1e40af" fillOpacity="0.8" />
              <text x="200" y="85" textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="bold">
                FAST AIR = LOW P
              </text>
            </g>
            <g filter="url(#magnTextShadow)">
              <rect x="135" y="225" width="130" height="22" rx="4" fill="#991b1b" fillOpacity="0.8" />
              <text x="200" y="240" textAnchor="middle" fill="#fca5a5" fontSize="11" fontWeight="bold">
                SLOW AIR = HIGH P
              </text>
            </g>

            {/* === MAGNUS FORCE ARROW === */}
            <g filter="url(#magnForceGlow)">
              {/* Force arrow background glow */}
              <line x1="200" y1="195" x2="200" y2="115" stroke="#22c55e" strokeWidth="8" opacity="0.3" strokeLinecap="round" />
              {/* Main force arrow */}
              <line x1="200" y1="190" x2="200" y2="120" stroke="url(#magnForceArrow)" strokeWidth="4" strokeLinecap="round" markerEnd="url(#magnArrowForce)" />
            </g>

            {/* Force label with premium box */}
            <g filter="url(#magnTextShadow)">
              <rect x="215" y="140" width="95" height="26" rx="5" fill="#166534" fillOpacity="0.9" stroke="#4ade80" strokeWidth="1" />
              <text x="262" y="158" textAnchor="middle" fill="#86efac" fontSize="12" fontWeight="bold">
                Magnus Force
              </text>
            </g>
          </g>
        )}

        {/* === 3D SPINNING BALL === */}
        <g transform={`translate(${ballX}, ${ballY})`} filter="url(#magnBallGlow)">
          {/* Ball drop shadow */}
          <ellipse cx="3" cy={size/2 + 5} rx={size/2.5} ry={size/8} fill="#000000" opacity="0.3" />

          {/* Main ball with 3D gradient */}
          <circle r={size/2} fill="url(#magnBall3D)" />

          {/* Ball shadow overlay for depth */}
          <circle r={size/2} fill="url(#magnBallShadow)" />

          {/* Ball specular highlight */}
          <circle r={size/2} fill="url(#magnBallHighlight)" />

          {/* Seam lines with rotation animation */}
          <g transform={`rotate(${ballRotation})`}>
            {/* Primary seam */}
            <path
              d={`M-${size/3},0 Q0,-${size/3} ${size/3},0 Q0,${size/3} -${size/3},0`}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              opacity="0.9"
              strokeLinecap="round"
            />
            {/* Secondary seam details */}
            <path
              d={`M-${size/4},${size/6} Q0,${size/4} ${size/4},${size/6}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.5"
              opacity="0.6"
              strokeLinecap="round"
            />
            <path
              d={`M-${size/4},-${size/6} Q0,-${size/4} ${size/4},-${size/6}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.5"
              opacity="0.6"
              strokeLinecap="round"
            />
          </g>

          {/* Rotation speed indicator ring */}
          <circle
            r={size/2 + 3}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.5"
            strokeDasharray={`${spinRate / 10} ${10 - spinRate / 10}`}
            opacity="0.6"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0"
              to={spinDirection === 'backspin' ? '-360' : '360'}
              dur={`${2 - spinRate / 100}s`}
              repeatCount="indefinite"
            />
          </circle>

          {/* === SPIN DIRECTION INDICATORS === */}
          <g filter="url(#magnSpinGlow)">
            {spinDirection === 'topspin' && (
              <g>
                {/* Topspin arc with glow */}
                <path
                  d={`M-18,-${size/2 + 12} A24,24 0 0 1 18,-${size/2 + 12}`}
                  fill="none"
                  stroke="url(#magnSpinIndicator)"
                  strokeWidth="3"
                  markerEnd="url(#magnArrowSpin)"
                />
                <text x="0" y={-size/2 - 22} textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="bold" filter="url(#magnTextShadow)">
                  TOPSPIN
                </text>
              </g>
            )}
            {spinDirection === 'backspin' && (
              <g>
                {/* Backspin arc with glow */}
                <path
                  d={`M18,-${size/2 + 12} A24,24 0 0 0 -18,-${size/2 + 12}`}
                  fill="none"
                  stroke="url(#magnSpinIndicator)"
                  strokeWidth="3"
                  markerEnd="url(#magnArrowSpin)"
                />
                <text x="0" y={-size/2 - 22} textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="bold" filter="url(#magnTextShadow)">
                  BACKSPIN
                </text>
              </g>
            )}
            {spinDirection === 'sidespin' && (
              <g>
                {/* Sidespin indicator */}
                <path
                  d={`M${size/2 + 12},-18 A24,24 0 0 1 ${size/2 + 12},18`}
                  fill="none"
                  stroke="url(#magnSpinIndicator)"
                  strokeWidth="3"
                  markerEnd="url(#magnArrowSpin)"
                />
                <text x={size/2 + 25} y="0" textAnchor="start" fill="#fbbf24" fontSize="10" fontWeight="bold" filter="url(#magnTextShadow)">
                  SIDESPIN
                </text>
              </g>
            )}
          </g>
        </g>

        {/* === TARGET ZONE === */}
        <g>
          <rect x="360" y="100" width="32" height="180" fill="url(#magnTargetZone)" rx="6" />
          <rect x="360" y="100" width="32" height="180" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeDasharray="4,4" rx="6" opacity="0.6" />
          {/* Target rings */}
          {[0, 1, 2].map((i) => (
            <circle
              key={`target-${i}`}
              cx="376"
              cy="190"
              r={15 + i * 15}
              fill="none"
              stroke="#4ade80"
              strokeWidth="1"
              opacity={0.5 - i * 0.15}
            />
          ))}
          <text x="376" y="290" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="bold" filter="url(#magnTextShadow)">
            TARGET
          </text>
        </g>

        {/* === MEASUREMENT SCALE === */}
        <g opacity="0.5">
          <line x1="50" y1="300" x2="350" y2="300" stroke="#64748b" strokeWidth="1" />
          {[50, 100, 150, 200, 250, 300, 350].map((x) => (
            <g key={`scale-${x}`}>
              <line x1={x} y1="295" x2={x} y2="300" stroke="#64748b" strokeWidth="1" />
              <text x={x} y="310" textAnchor="middle" fill="#64748b" fontSize="8">
                {x - 50}
              </text>
            </g>
          ))}
        </g>
      </svg>
    );
  };

  // PHASE 1: HOOK - Welcome page explaining the Magnus effect
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-8 px-6">
      {/* Premium badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-red-400/80 text-sm font-medium tracking-wide uppercase">Sports Physics</span>
      </div>

      {/* Gradient title */}
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-3 bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
        The Magnus Effect
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg md:text-xl text-center mb-8 max-w-lg">
        How does spinning make a ball curve through the air?
      </p>

      {/* Premium card */}
      <div className="w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        {renderSpinningBall(50, false)}
        <p className="text-gray-300 text-center leading-relaxed mt-4 mb-4">
          A pitcher throws a baseball with heavy spin. Instead of going straight, it curves dramatically - baffling the batter!
        </p>
        <p className="text-slate-400 text-sm text-center mb-4">
          The Magnus effect explains how spinning objects curve through fluids like air and water. It is the secret behind curveballs, banana kicks, and sliced golf shots.
        </p>
        <button
          onClick={() => startAnimation()}
          style={{ zIndex: 10 }}
          className="relative w-full px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-white font-medium rounded-xl transition-colors border border-white/10"
        >
          Watch a Curveball
        </button>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => goToPhase('predict')}
        style={{ zIndex: 10 }}
        className="relative group px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 flex items-center gap-2"
      >
        Discover the Secret
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      {/* Hint text */}
      <p className="text-slate-500 text-sm mt-6">
        Learn the physics behind curveballs and banana kicks
      </p>
    </div>
  );

  // PHASE 2: PREDICT - Prediction question about spinning ball trajectory
  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A ball is thrown with topspin (rotating forward). Why does it curve downward?
        </p>
        <svg width="300" height="150" className="mx-auto">
          <rect width="300" height="150" fill="#1e3a5f" rx="8" />
          <circle cx="80" cy="75" r="25" fill="#dc2626" />
          <path d="M55,60 A30,30 0 0 1 105,60" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowPred)" />
          <text x="80" y="45" textAnchor="middle" fill="#fbbf24" fontSize="10">Topspin</text>
          <line x1="110" y1="75" x2="250" y2="75" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" />
          <text x="180" y="70" fill="#94a3b8" fontSize="10">Which way?</text>
          <line x1="250" y1="75" x2="250" y2="120" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowDown)" />
          <line x1="250" y1="75" x2="250" y2="30" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowUp)" />
          <defs>
            <marker id="arrowPred" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill="#fbbf24" />
            </marker>
            <marker id="arrowDown" markerWidth="8" markerHeight="8" refX="3" refY="0" orient="auto">
              <path d="M0,0 L6,0 L3,7 z" fill="#22c55e" />
            </marker>
            <marker id="arrowUp" markerWidth="8" markerHeight="8" refX="3" refY="7" orient="auto">
              <path d="M0,7 L6,7 L3,0 z" fill="#ef4444" />
            </marker>
          </defs>
        </svg>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The spin adds weight to the ball' },
          { id: 'B', text: 'Spin creates different air pressures on opposite sides' },
          { id: 'C', text: 'The air "grabs" the ball and pulls it down' },
          { id: 'D', text: 'Spinning balls always fall faster due to gyroscopic effects' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            style={{ zIndex: 10 }}
            disabled={showPredictionFeedback}
            className={`relative p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'B'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'B'
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
            {selectedPrediction === 'B' ? 'Correct!' : 'Not quite!'} The spinning ball creates <span className="text-cyan-400">pressure differences</span> in the surrounding air!
          </p>
          <button
            onClick={() => goToPhase('play')}
            style={{ zIndex: 10 }}
            className="relative mt-4 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  // PHASE 3: PLAY - Interactive simulation with adjustable spin rate and direction
  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Magnus Effect Lab</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderSpinningBall(50, true)}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-red-400">{spinRate}%</div>
            <div className="text-sm text-slate-400">Spin Rate</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">{ballSpeed}%</div>
            <div className="text-sm text-slate-400">Ball Speed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{spinDirection}</div>
            <div className="text-sm text-slate-400">Spin Type</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-sm text-slate-300 mb-2 block">Spin Rate: {spinRate}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={spinRate}
            onChange={(e) => {
              setSpinRate(Number(e.target.value));
              onGameEvent?.({ type: 'spin_changed', data: { spinRate: Number(e.target.value) } });
            }}
            className="w-full"
          />
        </div>
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-sm text-slate-300 mb-2 block">Ball Speed: {ballSpeed}%</label>
          <input
            type="range"
            min="20"
            max="100"
            value={ballSpeed}
            onChange={(e) => {
              setBallSpeed(Number(e.target.value));
              onGameEvent?.({ type: 'parameter_changed', data: { ballSpeed: Number(e.target.value) } });
            }}
            className="w-full"
          />
        </div>
        <div className="md:col-span-2 flex gap-2 justify-center">
          {(['topspin', 'backspin', 'sidespin'] as const).map(type => (
            <button
              key={type}
              onClick={() => {
                setSpinDirection(type);
                onGameEvent?.({ type: 'spin_changed', data: { spinDirection: type } });
              }}
              style={{ zIndex: 10 }}
              className={`relative px-4 py-2 rounded-lg font-medium transition-all ${
                spinDirection === type ? 'bg-red-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        <div className="md:col-span-2">
          <button
            onClick={() => startAnimation()}
            style={{ zIndex: 10 }}
            className="relative w-full p-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
          >
            Throw Ball
          </button>
        </div>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">How the Magnus Effect Works:</h3>
        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">1</div>
            <p>Spinning ball drags air around with it (boundary layer)</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">2</div>
            <p>On one side, spin adds to airflow speed. On the other, it subtracts.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">3</div>
            <p>Faster air = lower pressure (Bernoulli's principle). Ball curves toward low pressure!</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('review')}
        style={{ zIndex: 10 }}
        className="relative mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
      >
        Review the Concepts
      </button>
    </div>
  );

  // PHASE 4: REVIEW - Explain pressure differential from air velocity differences
  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding the Magnus Effect</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-red-400 mb-3">The Physics of Pressure Differential</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>- Spinning ball creates asymmetric airflow around it</li>
            <li>- One side: ball surface moves WITH airflow (adds speed)</li>
            <li>- Other side: ball surface moves AGAINST airflow (subtracts speed)</li>
            <li>- Fast air = low pressure, slow air = high pressure</li>
            <li>- Ball pushed from high to low pressure side!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">The Math</h3>
          <div className="space-y-2 text-slate-300 text-sm">
            <p className="font-mono bg-slate-800/50 p-2 rounded">F = CL x (1/2)pv^2A</p>
            <ul className="mt-2 space-y-1">
              <li>- F = Magnus force</li>
              <li>- CL = Lift coefficient (depends on spin)</li>
              <li>- p = Air density</li>
              <li>- v = Ball velocity</li>
              <li>- A = Cross-sectional area</li>
            </ul>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Spin Direction Effects</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl mb-2">Topspin</div>
              <p className="text-slate-300">Ball curves DOWN</p>
              <p className="text-slate-400 text-xs">Tennis groundstrokes, soccer shots</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">Backspin</div>
              <p className="text-slate-300">Ball curves UP (floats)</p>
              <p className="text-slate-400 text-xs">Golf drives, basketball shots</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">Sidespin</div>
              <p className="text-slate-300">Ball curves LEFT or RIGHT</p>
              <p className="text-slate-400 text-xs">Curveballs, sliders, hooks</p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{ zIndex: 10 }}
        className="relative mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Discover a Surprising Twist
      </button>
    </div>
  );

  // PHASE 5: TWIST_PREDICT - Different ball size/sport scenario
  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Different sports use different ball sizes and surfaces. A ping pong ball is tiny and smooth, while a volleyball is large and textured.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What happens when a smooth ball spins VERY fast at VERY high speeds?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The curve gets even stronger' },
          { id: 'B', text: 'The ball goes perfectly straight' },
          { id: 'C', text: 'The curve can actually REVERSE direction!' },
          { id: 'D', text: 'The ball slows down due to friction' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            style={{ zIndex: 10 }}
            disabled={showTwistFeedback}
            className={`relative p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'C'
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
            Incredible! The "Reverse Magnus Effect" is real!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            At extreme spin rates and speeds, the boundary layer behavior changes completely!
          </p>
          <button
            onClick={() => goToPhase('twist_play')}
            style={{ zIndex: 10 }}
            className="relative mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            See How It Works
          </button>
        </div>
      )}
    </div>
  );

  // PHASE 6: TWIST_PLAY - Interactive comparison of different sports balls
  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">Comparing Different Sports Balls</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-3xl">
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2 text-center">Normal Magnus (Baseball)</h3>
          <svg width="180" height="120" className="mx-auto">
            <rect width="180" height="120" fill="#1e3a5f" rx="8" />
            <circle cx="50" cy="60" r="20" fill="#dc2626" />
            <path d="M30,45 A25,25 0 0 1 70,45" fill="none" stroke="#fbbf24" strokeWidth="2" />
            <path d="M70,60 Q120,40 160,60" fill="none" stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrNorm)" />
            <text x="115" y="35" fill="#22c55e" fontSize="10">Curves up</text>
            <text x="90" y="100" fill="#94a3b8" fontSize="9">Stitched ball, normal speed</text>
            <defs>
              <marker id="arrNorm" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill="#22c55e" />
              </marker>
            </defs>
          </svg>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-purple-400 mb-2 text-center">Reverse Magnus (Volleyball)</h3>
          <svg width="180" height="120" className="mx-auto">
            <rect width="180" height="120" fill="#1e3a5f" rx="8" />
            <circle cx="50" cy="60" r="20" fill="#fbbf24" />
            {/* Very fast spin indicator */}
            <path d="M30,45 A25,25 0 0 1 70,45" fill="none" stroke="#fbbf24" strokeWidth="3" />
            <path d="M35,50 A20,20 0 0 1 65,50" fill="none" stroke="#fbbf24" strokeWidth="2" />
            <path d="M70,60 Q120,80 160,60" fill="none" stroke="#a855f7" strokeWidth="3" markerEnd="url(#arrRev)" />
            <text x="115" y="90" fill="#a855f7" fontSize="10">Curves DOWN!</text>
            <text x="90" y="110" fill="#94a3b8" fontSize="9">Smooth ball, extreme spin</text>
            <defs>
              <marker id="arrRev" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill="#a855f7" />
              </marker>
            </defs>
          </svg>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-purple-400 mb-3">Why Ball Surface Matters</h3>
        <div className="grid grid-cols-2 gap-4 text-sm text-slate-300 mb-4">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <h4 className="text-cyan-400 font-semibold mb-2">Smooth Balls</h4>
            <p>Ping pong, volleyball - can experience reverse Magnus at high speeds</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <h4 className="text-orange-400 font-semibold mb-2">Textured Balls</h4>
            <p>Golf (dimples), baseball (seams) - enhanced normal Magnus effect</p>
          </div>
        </div>
        <p className="text-cyan-400 mt-4 text-sm">
          This is why float serves in volleyball are so unpredictable - the smooth ball can curve unexpectedly!
        </p>
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        style={{ zIndex: 10 }}
        className="relative mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Review the Discovery
      </button>
    </div>
  );

  // PHASE 7: TWIST_REVIEW - Explain factors affecting Magnus force magnitude
  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">Factors Affecting Magnus Force</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">The Magnus Effect Has Hidden Complexity!</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            The Magnus effect is not a simple linear relationship. The force magnitude depends on:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li><span className="text-cyan-400 font-semibold">Ball surface texture</span> - smooth vs dimpled vs rough (seams)</li>
            <li><span className="text-cyan-400 font-semibold">Spin rate</span> - more spin = more curve (usually)</li>
            <li><span className="text-cyan-400 font-semibold">Forward velocity</span> - faster balls experience more force</li>
            <li><span className="text-cyan-400 font-semibold">Reynolds number</span> - fluid dynamics parameter combining size, speed, and viscosity</li>
            <li><span className="text-cyan-400 font-semibold">Air density</span> - altitude and temperature affect air behavior</li>
          </ol>
          <p className="text-emerald-400 font-medium mt-4">
            The curve can be normal, enhanced, reduced, or even reversed depending on these factors!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            This is why golf balls have dimples - they create a controlled turbulent boundary layer that ENHANCES the Magnus effect while reducing overall drag!
          </p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        style={{ zIndex: 10 }}
        className="relative mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  // PHASE 8: TRANSFER - 4 real-world applications
  const applications = [
    {
      title: "Soccer Free Kicks",
      icon: "S",
      description: "The 'banana kick' curves around defensive walls using sidespin.",
      details: "Players like Roberto Carlos and David Beckham mastered kicks that curve dramatically. The ball can bend over 10 feet from a straight line, going around walls and into the goal. The famous Roberto Carlos free kick in 1997 curved so much that a ball boy ducked thinking it would miss!",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          <rect width="200" height="150" fill="#2d5a27" rx="8" />
          {/* Goal */}
          <rect x="160" y="40" width="30" height="70" fill="none" stroke="#ffffff" strokeWidth="2" />
          {/* Wall of defenders */}
          <rect x="100" y="50" width="20" height="50" fill="#3b82f6" rx="3" />
          {/* Ball path - banana curve */}
          <path d="M30,100 Q80,30 180,75" fill="none" stroke="#ffffff" strokeWidth="3" strokeDasharray="5,5" />
          <circle cx="30" cy="100" r="6" fill="#ffffff" stroke="#000000" strokeWidth="1" />
          <circle cx="180" cy="75" r="6" fill="#ffffff" stroke="#000000" strokeWidth="1" />
          <text x="70" y="20" fill="#fbbf24" fontSize="10">Banana curve!</text>
          <text x="100" y="140" fill="#94a3b8" fontSize="9">Ball bends around wall</text>
        </svg>
      )
    },
    {
      title: "Baseball Curveballs",
      icon: "B",
      description: "Curveballs, sliders, and cutters all use the Magnus effect to fool batters.",
      details: "A curveball can drop up to 17 inches from its expected path. Pitchers grip the ball to maximize spin using the seams, creating dramatic movement. The 12-6 curveball drops straight down, while sliders curve sideways.",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          <rect width="200" height="150" fill="#2d5a27" rx="8" />
          {/* Pitcher's mound */}
          <ellipse cx="40" cy="100" rx="25" ry="10" fill="#8b6914" />
          {/* Ball trajectory */}
          <path d="M50,80 Q100,40 180,100" fill="none" stroke="#ffffff" strokeWidth="3" strokeDasharray="5,5" />
          <circle cx="180" cy="100" r="8" fill="#ffffff" />
          {/* Home plate */}
          <polygon points="170,130 180,120 190,130 185,140 175,140" fill="#ffffff" />
          <text x="100" y="30" textAnchor="middle" fill="#ffffff" fontSize="11">Curveball path</text>
          {/* Straight line for comparison */}
          <path d="M50,80 L180,80" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
          <text x="115" y="75" fill="#ef4444" fontSize="8">Expected straight path</text>
        </svg>
      )
    },
    {
      title: "Golf Backspin",
      icon: "G",
      description: "Backspin keeps the ball airborne longer, dramatically increasing distance.",
      details: "A well-struck drive has 2,500-3,000 RPM of backspin. The Magnus effect creates lift that keeps the ball in the air 2-3 times longer than a non-spinning ball would fly. Dimples enhance this effect while reducing drag!",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          <rect width="200" height="150" fill="#87ceeb" rx="8" />
          {/* Ground */}
          <rect x="0" y="120" width="200" height="30" fill="#2d5a27" />
          {/* Tee */}
          <rect x="25" y="110" width="4" height="15" fill="#8b6914" />
          <circle cx="27" cy="108" r="5" fill="#ffffff" />
          {/* Backspin ball path - stays up longer */}
          <path d="M30,105 Q100,20 190,100" fill="none" stroke="#ffffff" strokeWidth="3" strokeDasharray="5,5" />
          {/* No-spin comparison */}
          <path d="M30,105 Q80,60 120,120" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="3,3" opacity="0.6" />
          <text x="130" y="40" fill="#ffffff" fontSize="10">With backspin</text>
          <text x="85" y="90" fill="#ef4444" fontSize="8">No spin</text>
          {/* Flag */}
          <rect x="185" y="90" width="2" height="30" fill="#8b6914" />
          <polygon points="187,90 187,100 195,95" fill="#ef4444" />
        </svg>
      )
    },
    {
      title: "Tennis Topspin",
      icon: "T",
      description: "Heavy topspin makes the ball dip sharply, keeping aggressive shots on the table.",
      details: "Professional players generate over 3,000 RPM of topspin! The Magnus effect makes the ball curve downward so sharply that seemingly impossible high shots clear the net and still land in the court. Rafael Nadal's forehand is famous for extreme topspin.",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          <rect width="200" height="150" fill="#1e5631" rx="8" />
          {/* Court lines */}
          <line x1="0" y1="110" x2="200" y2="110" stroke="#ffffff" strokeWidth="2" />
          {/* Net */}
          <rect x="98" y="80" width="4" height="30" fill="#ffffff" />
          {/* Ball with heavy topspin - dips sharply */}
          <path d="M30,70 Q100,30 170,100" fill="none" stroke="#ccff00" strokeWidth="3" />
          <circle cx="30" cy="70" r="6" fill="#ccff00" />
          <circle cx="170" cy="100" r="6" fill="#ccff00" />
          {/* Spin arrow */}
          <path d="M25,60 A10,10 0 0 1 35,60" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#spinArrTennis)" />
          <text x="100" y="130" textAnchor="middle" fill="#94a3b8" fontSize="10">Topspin makes ball dip</text>
          <text x="60" y="50" fill="#fbbf24" fontSize="9">Topspin</text>
          <defs>
            <marker id="spinArrTennis" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#fbbf24" />
            </marker>
          </defs>
        </svg>
      )
    }
  ];

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {applications.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveAppTab(index)}
            style={{ zIndex: 10 }}
            className={`relative px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index
                ? 'bg-red-600 text-white'
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            [{app.icon}] {app.title.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl font-bold text-red-400">[{applications[activeAppTab].icon}]</span>
          <h3 className="text-xl font-bold text-white">{applications[activeAppTab].title}</h3>
        </div>

        {applications[activeAppTab].animation}

        <p className="text-lg text-slate-300 mt-4 mb-3">
          {applications[activeAppTab].description}
        </p>
        <p className="text-sm text-slate-400">
          {applications[activeAppTab].details}
        </p>

        {!completedApps.has(activeAppTab) && (
          <button
            onClick={() => handleAppComplete(activeAppTab)}
            style={{ zIndex: 10 }}
            className="relative mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
          >
            Mark as Understood
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">
          {applications.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`}
            />
          ))}
        </div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>

      {completedApps.size >= 4 && (
        <button
          onClick={() => goToPhase('test')}
          style={{ zIndex: 10 }}
          className="relative mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
        >
          Take the Knowledge Test
        </button>
      )}
    </div>
  );

  // PHASE 9: TEST - 10 multiple choice questions
  const renderTest = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>

      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-white font-medium mb-3">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    style={{ zIndex: 10 }}
                    className={`relative p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-red-600 text-white'
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
            onClick={() => {
              const score = calculateScore();
              setTestScore?.(score);
              setShowTestResults(true);
              onGameEvent?.({ type: 'test_completed', data: { score, total: 10 } });
            }}
            style={{ zIndex: 10 }}
            disabled={testAnswers.includes(-1)}
            className={`relative w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-500 hover:to-orange-500'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? '[*]' : '[?]'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Score: {calculateScore()}/10
          </h3>
          <p className="text-slate-300 mb-6">
            {calculateScore() >= 7
              ? 'Excellent! You have mastered the Magnus effect!'
              : 'Keep studying! Review the concepts and try again.'}
          </p>

          {calculateScore() >= 7 ? (
            <button
              onClick={() => {
                goToPhase('mastery');
                onGameEvent?.({ type: 'mastery_achieved', data: { score: calculateScore() } });
              }}
              style={{ zIndex: 10 }}
              className="relative px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onClick={() => { setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase('review'); }}
              style={{ zIndex: 10 }}
              className="relative px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
            >
              Review and Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  // PHASE 10: MASTERY - Congratulations page
  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-red-900/50 via-orange-900/50 to-yellow-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">[M]</div>
        <h1 className="text-3xl font-bold text-white mb-4">Magnus Effect Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          Congratulations! You have mastered the physics of spinning balls and curved trajectories!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">[~]</div>
            <p className="text-sm text-slate-300">Spin Physics</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">[^]</div>
            <p className="text-sm text-slate-300">Pressure Dynamics</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">[o]</div>
            <p className="text-sm text-slate-300">Sports Applications</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">[{'<>'}]</div>
            <p className="text-sm text-slate-300">Reverse Magnus</p>
          </div>
        </div>

        <p className="text-slate-400 mb-6">
          You now understand why curveballs curve, how banana kicks bend around walls, and why golf balls fly so far. This knowledge applies to any spinning object moving through a fluid!
        </p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => goToPhase('hook')}
            style={{ zIndex: 10 }}
            className="relative px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            Explore Again
          </button>
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

  const currentPhaseIndex = phaseOrder.indexOf(phase);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Ambient background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl" />
      </div>

      {/* Premium progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/70 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-400">Magnus Effect</span>
            <span className="text-sm text-slate-500">{phaseLabels[phase]}</span>
          </div>
          {/* Phase dots */}
          <div className="flex justify-between px-1">
            {phaseOrder.map((p, index) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
                className={`relative h-2 rounded-full transition-all duration-300 ${
                  index <= currentPhaseIndex
                    ? 'bg-red-500'
                    : 'bg-slate-700'
                } ${p === phase ? 'w-6' : 'w-2'}`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="pt-20 pb-8 relative z-10">
        {renderPhase()}
      </div>
    </div>
  );
};

export default MagnusEffectRenderer;
