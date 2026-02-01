import React, { useState, useEffect, useCallback } from 'react';

// Phase type for 10-phase learning structure
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'simulation_stopped'
  | 'parameter_changed'
  | 'animation_started'
  | 'animation_completed'
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

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

const AngularMomentumTransferRenderer: React.FC<Props> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
  const phaseLabels: Record<Phase, string> = {
    hook: 'Hook',
    predict: 'Predict',
    play: 'Lab',
    review: 'Review',
    twist_predict: 'Twist',
    twist_play: 'Demo',
    twist_review: 'Discovery',
    transfer: 'Apply',
    test: 'Test',
    mastery: 'Mastery'
  };

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
    primary: '#f97316',       // orange-500 (cat theme)
    primaryDark: '#ea580c',   // orange-600
    accent: '#8b5cf6',        // violet-500
    secondary: '#f59e0b',     // amber-500
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

  // Animation states
  const [fallProgress, setFallProgress] = useState(0);
  const [catRotation, setCatRotation] = useState(180); // Starts upside down
  const [frontLegsExtended, setFrontLegsExtended] = useState(false);
  const [backLegsExtended, setBackLegsExtended] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPhaseLabelsState, setShowPhaseLabelsState] = useState(true);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sound utility with Web Audio API
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'complete' | 'transition' | 'meow') => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
        click: { freq: 600, duration: 0.1, type: 'sine' },
        success: { freq: 800, duration: 0.2, type: 'sine' },
        failure: { freq: 300, duration: 0.3, type: 'sawtooth' },
        complete: { freq: 1000, duration: 0.3, type: 'sine' },
        transition: { freq: 500, duration: 0.15, type: 'triangle' },
        meow: { freq: 700, duration: 0.2, type: 'sine' }
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

  // Sync with external phase control
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseName: phaseLabels[newPhase] } });
    onPhaseComplete?.(newPhase);
  }, [playSound, onGameEvent, onPhaseComplete, phaseLabels]);

  // Cat righting animation
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setFallProgress(prev => {
        const newProgress = prev + 2;

        // Phase 1: 0-30% - Cat extends back legs, tucks front legs
        if (newProgress < 30) {
          setFrontLegsExtended(false);
          setBackLegsExtended(true);
          setCatRotation(180 - (newProgress / 30) * 90); // Rotate front half
        }
        // Phase 2: 30-60% - Swap: extend front, tuck back
        else if (newProgress < 60) {
          setFrontLegsExtended(true);
          setBackLegsExtended(false);
          setCatRotation(90 - ((newProgress - 30) / 30) * 90); // Rotate back half
        }
        // Phase 3: 60-100% - Prepare for landing
        else if (newProgress < 100) {
          setFrontLegsExtended(true);
          setBackLegsExtended(true);
          setCatRotation(Math.max(0, 0 - ((newProgress - 60) / 40) * 5)); // Fine tuning
        }
        // Reset
        else {
          setIsAnimating(false);
          return 0;
        }

        return newProgress;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating]);

  useEffect(() => {
    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', data: { phase } });
    }
  }, [phase, onGameEvent]);

  const handlePrediction = useCallback((prediction: string) => {
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'C' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
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

  const startAnimation = useCallback(() => {
    setFallProgress(0);
    setCatRotation(180);
    setFrontLegsExtended(false);
    setBackLegsExtended(true);
    setIsAnimating(true);
  }, []);

  const testQuestions = [
    {
      question: "How can a cat rotate in mid-air without external torque?",
      options: [
        { text: "It pushes against the air", correct: false },
        { text: "It transfers angular momentum between body parts", correct: true },
        { text: "Gravity helps it rotate", correct: false },
        { text: "It can't - cats have magic", correct: false }
      ]
    },
    {
      question: "When a cat extends one set of legs while tucking the other:",
      options: [
        { text: "Both halves rotate the same amount", correct: false },
        { text: "The tucked half rotates more", correct: true },
        { text: "The extended half rotates more", correct: false },
        { text: "Neither half rotates", correct: false }
      ]
    },
    {
      question: "During the righting reflex, the total angular momentum of the cat is:",
      options: [
        { text: "Constantly increasing", correct: false },
        { text: "Constantly decreasing", correct: false },
        { text: "Zero (or constant)", correct: true },
        { text: "Negative", correct: false }
      ]
    },
    {
      question: "The 'moment of inertia' of extended legs compared to tucked legs is:",
      options: [
        { text: "Smaller", correct: false },
        { text: "Larger", correct: true },
        { text: "The same", correct: false },
        { text: "Undefined", correct: false }
      ]
    },
    {
      question: "If a body part has lower moment of inertia, it can rotate:",
      options: [
        { text: "Slower", correct: false },
        { text: "Faster for the same angular momentum", correct: true },
        { text: "Not at all", correct: false },
        { text: "Only backward", correct: false }
      ]
    },
    {
      question: "Astronauts can self-rotate in space using the same principle by:",
      options: [
        { text: "Swimming through air", correct: false },
        { text: "Extending and retracting their limbs asymmetrically", correct: true },
        { text: "Using jet packs", correct: false },
        { text: "Pushing off walls only", correct: false }
      ]
    },
    {
      question: "The minimum height for a cat to right itself is approximately:",
      options: [
        { text: "1 centimeter", correct: false },
        { text: "30 centimeters (about 1 foot)", correct: true },
        { text: "5 meters", correct: false },
        { text: "Any height works", correct: false }
      ]
    },
    {
      question: "If a falling object has zero initial angular momentum, its final angular momentum will be:",
      options: [
        { text: "Positive", correct: false },
        { text: "Negative", correct: false },
        { text: "Zero", correct: true },
        { text: "Depends on shape", correct: false }
      ]
    },
    {
      question: "The cat righting problem was famously studied using:",
      options: [
        { text: "Slow motion photography", correct: true },
        { text: "Computer simulations only", correct: false },
        { text: "Mathematical theory only", correct: false },
        { text: "It has never been studied", correct: false }
      ]
    },
    {
      question: "A diver performing twists uses the same principle by:",
      options: [
        { text: "Flapping their arms like wings", correct: false },
        { text: "Asymmetrically moving arms and legs", correct: true },
        { text: "Holding completely still", correct: false },
        { text: "Spinning before jumping", correct: false }
      ]
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  // Premium SVG Definitions for Angular Momentum Transfer visualizations
  const renderSVGDefs = () => (
    <defs>
      {/* === GRADIENT DEFINITIONS === */}

      {/* Premium sky gradient with depth */}
      <linearGradient id="amtSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#0369a1" />
        <stop offset="25%" stopColor="#0ea5e9" />
        <stop offset="50%" stopColor="#38bdf8" />
        <stop offset="75%" stopColor="#7dd3fc" />
        <stop offset="100%" stopColor="#bae6fd" />
      </linearGradient>

      {/* Cat body gradient - main orange fur */}
      <linearGradient id="amtCatBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fb923c" />
        <stop offset="25%" stopColor="#f97316" />
        <stop offset="50%" stopColor="#ea580c" />
        <stop offset="75%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#c2410c" />
      </linearGradient>

      {/* Cat front body lighter gradient */}
      <linearGradient id="amtCatFrontGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fdba74" />
        <stop offset="30%" stopColor="#fb923c" />
        <stop offset="70%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#ea580c" />
      </linearGradient>

      {/* Cat leg gradient for 3D effect */}
      <linearGradient id="amtCatLegGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ea580c" />
        <stop offset="30%" stopColor="#f97316" />
        <stop offset="50%" stopColor="#fb923c" />
        <stop offset="70%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#c2410c" />
      </linearGradient>

      {/* Cat head gradient with highlight */}
      <radialGradient id="amtCatHeadGrad" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#fdba74" />
        <stop offset="30%" stopColor="#fb923c" />
        <stop offset="60%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#ea580c" />
      </radialGradient>

      {/* Tail gradient */}
      <linearGradient id="amtTailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f97316" />
        <stop offset="50%" stopColor="#ea580c" />
        <stop offset="100%" stopColor="#c2410c" />
      </linearGradient>

      {/* Ground/grass gradient */}
      <linearGradient id="amtGroundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#22c55e" />
        <stop offset="30%" stopColor="#16a34a" />
        <stop offset="60%" stopColor="#15803d" />
        <stop offset="100%" stopColor="#166534" />
      </linearGradient>

      {/* Angular momentum arrow gradient - clockwise */}
      <linearGradient id="amtArrowCWGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#22c55e" />
        <stop offset="50%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#86efac" />
      </linearGradient>

      {/* Angular momentum arrow gradient - counter-clockwise */}
      <linearGradient id="amtArrowCCWGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="50%" stopColor="#f87171" />
        <stop offset="100%" stopColor="#fca5a5" />
      </linearGradient>

      {/* Spinning wheel gradient - metallic 3D effect */}
      <radialGradient id="amtWheelGrad" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="25%" stopColor="#64748b" />
        <stop offset="50%" stopColor="#475569" />
        <stop offset="75%" stopColor="#334155" />
        <stop offset="100%" stopColor="#1e293b" />
      </radialGradient>

      {/* Wheel rim highlight */}
      <linearGradient id="amtWheelRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#cbd5e1" />
        <stop offset="20%" stopColor="#94a3b8" />
        <stop offset="50%" stopColor="#64748b" />
        <stop offset="80%" stopColor="#475569" />
        <stop offset="100%" stopColor="#334155" />
      </linearGradient>

      {/* Transfer energy glow gradient */}
      <radialGradient id="amtTransferGlowGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
        <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.8" />
        <stop offset="60%" stopColor="#d97706" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
      </radialGradient>

      {/* Rotation speed indicator gradient */}
      <linearGradient id="amtSpeedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="25%" stopColor="#22d3ee" />
        <stop offset="50%" stopColor="#67e8f9" />
        <stop offset="75%" stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#0891b2" />
      </linearGradient>

      {/* Moment of inertia visualization - extended */}
      <radialGradient id="amtMoIExtendedGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
        <stop offset="50%" stopColor="#16a34a" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
      </radialGradient>

      {/* Moment of inertia visualization - tucked */}
      <radialGradient id="amtMoITuckedGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
        <stop offset="50%" stopColor="#d97706" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
      </radialGradient>

      {/* Cat eye shine */}
      <radialGradient id="amtEyeGrad" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#475569" />
        <stop offset="40%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#0f172a" />
      </radialGradient>

      {/* Cat nose gradient */}
      <radialGradient id="amtNoseGrad" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#fda4af" />
        <stop offset="60%" stopColor="#fb7185" />
        <stop offset="100%" stopColor="#f43f5e" />
      </radialGradient>

      {/* === FILTER DEFINITIONS === */}

      {/* Glow filter for angular momentum arrows */}
      <filter id="amtArrowGlow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Soft glow for transfer visualization */}
      <filter id="amtTransferGlow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Speed indicator blur */}
      <filter id="amtSpeedBlur" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Cat fur texture shadow */}
      <filter id="amtFurShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>

      {/* Inner glow for wheels */}
      <filter id="amtWheelGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Highlight filter for metallic surfaces */}
      <filter id="amtMetalHighlight">
        <feGaussianBlur stdDeviation="0.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>

      {/* === MARKER DEFINITIONS === */}

      <marker id="amtArrowHeadGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
        <path d="M0,0 L0,6 L9,3 z" fill="url(#amtArrowCWGrad)" />
      </marker>

      <marker id="amtArrowHeadRed" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
        <path d="M0,0 L0,6 L9,3 z" fill="url(#amtArrowCCWGrad)" />
      </marker>

      <marker id="amtArrowHeadCyan" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
        <path d="M0,0 L0,6 L9,3 z" fill="url(#amtSpeedGrad)" />
      </marker>
    </defs>
  );

  const renderCat = (rotation: number, frontExt: boolean, backExt: boolean, size: number = 200, showLabels: boolean = false) => {
    const centerX = size / 2;
    const centerY = size / 2;

    // Front and back body segments rotate somewhat independently
    const frontRotation = rotation;
    const backRotation = rotation; // In reality, slightly different, but simplified here

    // Calculate rotation speed visualization
    const rotationProgress = Math.abs(180 - rotation) / 180;

    return (
      <div style={{ position: 'relative' }}>
        <svg width={size} height={size} className="overflow-visible">
          {renderSVGDefs()}

          {/* Background - premium sky gradient */}
          <rect x="0" y="0" width={size} height={size} fill="url(#amtSkyGrad)" rx="10" />

          {/* Subtle cloud wisps */}
          <ellipse cx={size * 0.2} cy={size * 0.15} rx="20" ry="8" fill="white" opacity="0.3" />
          <ellipse cx={size * 0.8} cy={size * 0.25} rx="25" ry="10" fill="white" opacity="0.25" />
          <ellipse cx={size * 0.5} cy={size * 0.1} rx="15" ry="6" fill="white" opacity="0.2" />

          {/* Angular momentum visualization circles */}
          {showLabels && (
            <>
              {/* Front half moment of inertia indicator */}
              <circle
                cx={centerX - 30}
                cy={centerY}
                r={frontExt ? 45 : 25}
                fill={frontExt ? "url(#amtMoIExtendedGrad)" : "url(#amtMoITuckedGrad)"}
                opacity="0.6"
                style={{ transition: 'r 0.3s ease' }}
              />
              {/* Back half moment of inertia indicator */}
              <circle
                cx={centerX + 30}
                cy={centerY}
                r={backExt ? 45 : 25}
                fill={backExt ? "url(#amtMoIExtendedGrad)" : "url(#amtMoITuckedGrad)"}
                opacity="0.6"
                style={{ transition: 'r 0.3s ease' }}
              />
            </>
          )}

          {/* Rotation speed arc indicator */}
          {rotationProgress > 0.05 && (
            <path
              d={`M ${centerX - 60} ${centerY} A 60 60 0 0 1 ${centerX + 60} ${centerY}`}
              fill="none"
              stroke="url(#amtSpeedGrad)"
              strokeWidth="3"
              strokeDasharray={`${rotationProgress * 188} 188`}
              filter="url(#amtSpeedBlur)"
              opacity="0.8"
            />
          )}

          {/* Cat body */}
          <g transform={`translate(${centerX}, ${centerY}) rotate(${rotation})`} filter="url(#amtFurShadow)">
            {/* Back body segment */}
            <g transform={`rotate(${backRotation - rotation})`}>
              {/* Back body with gradient */}
              <ellipse cx="20" cy="0" rx="30" ry="20" fill="url(#amtCatBodyGrad)" />

              {/* Fur texture lines */}
              <path d="M5,-15 Q15,-12 25,-15" stroke="#c2410c" strokeWidth="0.5" fill="none" opacity="0.4" />
              <path d="M5,15 Q15,12 25,15" stroke="#c2410c" strokeWidth="0.5" fill="none" opacity="0.4" />

              {/* Back legs with gradient */}
              {backExt ? (
                <>
                  <rect x="30" y="-25" width="8" height="30" rx="3" fill="url(#amtCatLegGrad)" transform="rotate(-30, 30, -10)" />
                  <rect x="30" y="-5" width="8" height="30" rx="3" fill="url(#amtCatLegGrad)" transform="rotate(30, 30, 10)" />
                  {/* Paw details */}
                  <ellipse cx="48" cy="-30" rx="5" ry="3" fill="#ea580c" transform="rotate(-30, 30, -10)" />
                  <ellipse cx="48" cy="30" rx="5" ry="3" fill="#ea580c" transform="rotate(30, 30, 10)" />
                </>
              ) : (
                <>
                  <rect x="35" y="-12" width="6" height="15" rx="3" fill="url(#amtCatLegGrad)" transform="rotate(-15, 35, -5)" />
                  <rect x="35" y="-3" width="6" height="15" rx="3" fill="url(#amtCatLegGrad)" transform="rotate(15, 35, 5)" />
                </>
              )}

              {/* Premium tail with gradient stroke */}
              <path
                d="M45,0 Q60,-10 70,5 Q80,20 70,25"
                fill="none"
                stroke="url(#amtTailGrad)"
                strokeWidth="6"
                strokeLinecap="round"
              />

              {/* Angular momentum arrow for back section */}
              {showLabels && (
                <path
                  d={backExt ? "M50,30 A25,25 0 0 1 50,-30" : "M45,20 A15,15 0 0 0 45,-20"}
                  fill="none"
                  stroke={backExt ? "url(#amtArrowCWGrad)" : "url(#amtArrowCCWGrad)"}
                  strokeWidth="2.5"
                  markerEnd={backExt ? "url(#amtArrowHeadGreen)" : "url(#amtArrowHeadRed)"}
                  filter="url(#amtArrowGlow)"
                  opacity="0.9"
                />
              )}
            </g>

            {/* Front body segment */}
            <g transform={`rotate(${frontRotation - rotation})`}>
              {/* Front body with lighter gradient */}
              <ellipse cx="-20" cy="0" rx="25" ry="18" fill="url(#amtCatFrontGrad)" />

              {/* Head with radial gradient */}
              <circle cx="-45" cy="0" r="18" fill="url(#amtCatHeadGrad)" />

              {/* Ears with gradient */}
              <polygon points="-55,-15 -58,-30 -48,-18" fill="url(#amtCatBodyGrad)" />
              <polygon points="-35,-15 -32,-30 -42,-18" fill="url(#amtCatBodyGrad)" />
              {/* Inner ear */}
              <polygon points="-54,-17 -56,-26 -50,-19" fill="#fda4af" opacity="0.6" />
              <polygon points="-36,-17 -34,-26 -40,-19" fill="#fda4af" opacity="0.6" />

              {/* Eyes with gradient shine */}
              <circle cx="-50" cy="-3" r="3.5" fill="url(#amtEyeGrad)" />
              <circle cx="-40" cy="-3" r="3.5" fill="url(#amtEyeGrad)" />
              {/* Eye highlights */}
              <circle cx="-51" cy="-4" r="1" fill="white" opacity="0.8" />
              <circle cx="-41" cy="-4" r="1" fill="white" opacity="0.8" />

              {/* Nose with gradient */}
              <ellipse cx="-45" cy="5" rx="4" ry="2.5" fill="url(#amtNoseGrad)" />

              {/* Whiskers */}
              <line x1="-55" y1="3" x2="-68" y2="0" stroke="#94a3b8" strokeWidth="0.5" opacity="0.6" />
              <line x1="-55" y1="5" x2="-68" y2="5" stroke="#94a3b8" strokeWidth="0.5" opacity="0.6" />
              <line x1="-55" y1="7" x2="-68" y2="10" stroke="#94a3b8" strokeWidth="0.5" opacity="0.6" />
              <line x1="-35" y1="3" x2="-22" y2="0" stroke="#94a3b8" strokeWidth="0.5" opacity="0.6" />
              <line x1="-35" y1="5" x2="-22" y2="5" stroke="#94a3b8" strokeWidth="0.5" opacity="0.6" />
              <line x1="-35" y1="7" x2="-22" y2="10" stroke="#94a3b8" strokeWidth="0.5" opacity="0.6" />

              {/* Front legs with gradient */}
              {frontExt ? (
                <>
                  <rect x="-35" y="-25" width="8" height="30" rx="3" fill="url(#amtCatLegGrad)" transform="rotate(30, -35, -10)" />
                  <rect x="-35" y="-5" width="8" height="30" rx="3" fill="url(#amtCatLegGrad)" transform="rotate(-30, -35, 10)" />
                  {/* Paw details */}
                  <ellipse cx="-17" cy="-30" rx="5" ry="3" fill="#ea580c" transform="rotate(30, -35, -10)" />
                  <ellipse cx="-17" cy="30" rx="5" ry="3" fill="#ea580c" transform="rotate(-30, -35, 10)" />
                </>
              ) : (
                <>
                  <rect x="-30" y="-12" width="6" height="15" rx="3" fill="url(#amtCatLegGrad)" transform="rotate(15, -30, -5)" />
                  <rect x="-30" y="-3" width="6" height="15" rx="3" fill="url(#amtCatLegGrad)" transform="rotate(-15, -30, 5)" />
                </>
              )}

              {/* Angular momentum arrow for front section */}
              {showLabels && (
                <path
                  d={frontExt ? "M-50,-30 A25,25 0 0 0 -50,30" : "M-45,-20 A15,15 0 0 1 -45,20"}
                  fill="none"
                  stroke={frontExt ? "url(#amtArrowCWGrad)" : "url(#amtArrowCCWGrad)"}
                  strokeWidth="2.5"
                  markerEnd={frontExt ? "url(#amtArrowHeadGreen)" : "url(#amtArrowHeadRed)"}
                  filter="url(#amtArrowGlow)"
                  opacity="0.9"
                />
              )}
            </g>
          </g>

          {/* Transfer visualization - energy pulse between body halves */}
          {showLabels && rotationProgress > 0.1 && (
            <g>
              <circle
                cx={centerX}
                cy={centerY}
                r="8"
                fill="url(#amtTransferGlowGrad)"
                filter="url(#amtTransferGlow)"
                opacity={0.5 + rotationProgress * 0.5}
              >
                <animate
                  attributeName="r"
                  values="6;12;6"
                  dur="0.5s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          )}

          {/* Ground with premium gradient */}
          <rect x="0" y={size - 15} width={size} height="15" fill="url(#amtGroundGrad)" />
          {/* Grass texture */}
          <path
            d={`M5,${size - 15} L8,${size - 20} L11,${size - 15} M25,${size - 15} L28,${size - 18} L31,${size - 15} M45,${size - 15} L48,${size - 22} L51,${size - 15} M${size - 45},${size - 15} L${size - 42},${size - 19} L${size - 39},${size - 15} M${size - 25},${size - 15} L${size - 22},${size - 17} L${size - 19},${size - 15} M${size - 10},${size - 15} L${size - 7},${size - 20} L${size - 4},${size - 15}`}
            fill="#16a34a"
          />
        </svg>

        {/* Labels rendered outside SVG using typo system */}
        {showLabels && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '0',
            right: '0',
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0 10px'
          }}>
            <div style={{
              fontSize: typo.label,
              fontWeight: 700,
              color: frontExt ? colors.success : colors.secondary,
              backgroundColor: `${frontExt ? colors.success : colors.secondary}20`,
              padding: '4px 8px',
              borderRadius: '6px',
              border: `1px solid ${frontExt ? colors.success : colors.secondary}40`
            }}>
              Front: {frontExt ? 'Extended (Large I)' : 'Tucked (Small I)'}
            </div>
            <div style={{
              fontSize: typo.label,
              fontWeight: 700,
              color: backExt ? colors.success : colors.secondary,
              backgroundColor: `${backExt ? colors.success : colors.secondary}20`,
              padding: '4px 8px',
              borderRadius: '6px',
              border: `1px solid ${backExt ? colors.success : colors.secondary}40`
            }}>
              Back: {backExt ? 'Extended (Large I)' : 'Tucked (Small I)'}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-orange-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-amber-200 bg-clip-text text-transparent">
        The Cat Righting Reflex
      </h1>

      <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-8 leading-relaxed">
        How do cats always land on their feet with nothing to push against?
      </p>

      {/* Premium card with cat animation */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-8 max-w-2xl border border-slate-700/50 shadow-2xl shadow-orange-500/5 mb-8">
        <div className="flex justify-center mb-6">
          {renderCat(catRotation, frontLegsExtended, backLegsExtended, 220)}
        </div>

        <p className="text-xl text-slate-200 mb-4 leading-relaxed">
          Cats almost always land on their feet, even when dropped upside down from just a few feet up!
        </p>

        <p className="text-lg text-orange-400 font-medium mb-6">
          How do they rotate in mid-air with nothing to push against?
        </p>

        <button
          onClick={() => startAnimation()}
          style={{ zIndex: 10 }}
          className="px-6 py-3 bg-slate-700/80 hover:bg-slate-600/80 text-white font-medium rounded-xl transition-all duration-300 border border-slate-600/50 hover:border-orange-500/30 relative"
        >
          Watch Cat Fall
        </button>
      </div>

      {/* Premium CTA button */}
      <button
        onClick={() => goToPhase('predict')}
        style={{ zIndex: 10 }}
        className="group relative px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-2">
          Discover the Secret
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Subtle hint text */}
      <p className="mt-6 text-sm text-slate-500">
        Explore the physics of angular momentum transfer
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A cat is dropped upside down in free fall. How does it manage to rotate and land on its feet?
        </p>
        {renderCat(180, false, true, 180)}
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'It pushes against the air like swimming' },
          { id: 'B', text: 'Gravity pulls one side down first' },
          { id: 'C', text: 'It extends/retracts different body parts to redistribute angular momentum' },
          { id: 'D', text: 'Cats have a special "anti-gravity" organ' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{ zIndex: 10 }}
            className={`p-4 rounded-xl text-left transition-all duration-300 relative ${
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
            Correct! Cats use <span className="text-cyan-400">angular momentum transfer</span> between body parts!
          </p>
          <button
            onClick={() => goToPhase('play')}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300 relative"
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Cat Righting Lab</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderCat(catRotation, frontLegsExtended, backLegsExtended, 250, showPhaseLabelsState)}
        <div className="mt-4 flex justify-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{Math.round(180 - catRotation)}deg</div>
            <div className="text-sm text-slate-400">Rotation Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">{Math.round(fallProgress)}%</div>
            <div className="text-sm text-slate-400">Fall Progress</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
        <button
          onClick={() => startAnimation()}
          style={{ zIndex: 10 }}
          className="p-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold transition-colors relative"
        >
          Start Cat Drop
        </button>
        <button
          onClick={() => setShowPhaseLabelsState(!showPhaseLabelsState)}
          style={{ zIndex: 10 }}
          className={`p-4 rounded-xl transition-colors relative ${
            showPhaseLabelsState ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-slate-600 hover:bg-slate-500'
          } text-white font-semibold`}
        >
          {showPhaseLabelsState ? 'Labels: ON' : 'Labels: OFF'}
        </button>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">The Two-Phase Righting Reflex:</h3>
        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <div className="bg-orange-600 text-white px-2 py-1 rounded text-xs font-bold">Phase 1</div>
            <p>Front legs tuck (small I, fast rotation), back legs extend (large I, slow counter-rotation). Net result: front half rotates more!</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-amber-600 text-white px-2 py-1 rounded text-xs font-bold">Phase 2</div>
            <p>Swap! Front legs extend, back legs tuck. Now back half catches up with more rotation. Cat is now upright!</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('review')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300 relative"
      >
        Review the Concepts
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Angular Momentum Transfer</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-orange-900/50 to-amber-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-orange-400 mb-3">The Core Principle</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>Total angular momentum (L) must stay constant (zero in this case)</li>
            <li>L = I x omega (moment of inertia x angular velocity)</li>
            <li>If one part has small I, it rotates fast</li>
            <li>If another part has large I, it rotates slow</li>
            <li>By alternating which part is compact, net rotation accumulates!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">Cat's Flexible Spine</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>Cats have an extremely flexible spine</li>
            <li>They can rotate front and back halves almost independently</li>
            <li>30+ vertebrae give remarkable twist ability</li>
            <li>No collarbone allows front legs to move freely</li>
            <li>Reflexes complete in under 0.3 seconds!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">The Math</h3>
          <div className="text-slate-300 text-sm space-y-2">
            <p><strong>Conservation:</strong> L_front + L_back = 0 (always)</p>
            <p><strong>When front is tucked:</strong> I_front is small, so omega_front can be large while I_back x omega_back balances it</p>
            <p><strong>Net effect:</strong> Front rotates 90 degrees while back only counter-rotates 30 degrees</p>
            <p className="text-cyan-400 mt-3">
              Then swap configurations - back catches up while front barely moves. Total: 180 degree rotation with zero angular momentum!
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{ zIndex: 10 }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300 relative"
      >
        Discover a Surprising Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Imagine an astronaut floating in the middle of a space station, not touching anything. They're facing the wrong direction for their task.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          Can they rotate to face a different direction without grabbing anything?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'No - without something to push against, rotation is impossible' },
          { id: 'B', text: 'Yes - they can use the same technique as cats' },
          { id: 'C', text: 'Only if they throw something' },
          { id: 'D', text: 'Only with special astronaut equipment' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{ zIndex: 10 }}
            className={`p-4 rounded-xl text-left transition-all duration-300 relative ${
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
            Yes! Astronauts can self-rotate using the exact same physics!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            It's slower and less elegant than a cat, but the principle is identical. Astronauts are trained in these maneuvers!
          </p>
          <button
            onClick={() => goToPhase('twist_play')}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300 relative"
          >
            See How
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">Astronaut Self-Rotation</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-3xl">
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2 text-center">Cat Method</h3>
          <svg width="180" height="120" className="mx-auto" style={{ overflow: 'visible' }}>
            <defs>
              {/* Cat body gradient */}
              <linearGradient id="amtTwistCatBody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
              <linearGradient id="amtTwistCatFront" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fdba74" />
                <stop offset="50%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
              <radialGradient id="amtTwistCatHead" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#fdba74" />
                <stop offset="50%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#f97316" />
              </radialGradient>
              {/* Arrow gradients */}
              <linearGradient id="amtTwistArrowGreen" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#4ade80" />
              </linearGradient>
              <linearGradient id="amtTwistArrowRed" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#f87171" />
              </linearGradient>
              {/* Glow filters */}
              <filter id="amtTwistGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Arrow markers */}
              <marker id="amtTwistArrowHeadGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill="#4ade80" />
              </marker>
              <marker id="amtTwistArrowHeadRed" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill="#f87171" />
              </marker>
            </defs>
            {/* Premium cat silhouette with gradients */}
            <ellipse cx="60" cy="60" rx="25" ry="15" fill="url(#amtTwistCatBody)" />
            <ellipse cx="100" cy="60" rx="25" ry="15" fill="url(#amtTwistCatFront)" />
            <circle cx="130" cy="60" r="12" fill="url(#amtTwistCatHead)" />
            {/* Cat ears */}
            <polygon points="122,52 120,42 128,50" fill="url(#amtTwistCatBody)" />
            <polygon points="138,52 140,42 132,50" fill="url(#amtTwistCatBody)" />
            {/* Cat eyes */}
            <circle cx="126" cy="58" r="2" fill="#1e293b" />
            <circle cx="134" cy="58" r="2" fill="#1e293b" />
            <circle cx="125.5" cy="57.5" r="0.7" fill="white" />
            <circle cx="133.5" cy="57.5" r="0.7" fill="white" />
            {/* Cat tail */}
            <path d="M35,60 Q25,50 20,60 Q15,70 25,65" fill="none" stroke="url(#amtTwistCatBody)" strokeWidth="4" strokeLinecap="round" />
            {/* Rotation arrows with glow */}
            <path d="M60,35 A25,25 0 0 1 60,85" fill="none" stroke="url(#amtTwistArrowGreen)" strokeWidth="2.5" markerEnd="url(#amtTwistArrowHeadGreen)" filter="url(#amtTwistGlow)" />
            <path d="M100,85 A25,25 0 0 1 100,35" fill="none" stroke="url(#amtTwistArrowRed)" strokeWidth="2.5" markerEnd="url(#amtTwistArrowHeadRed)" filter="url(#amtTwistGlow)" />
            {/* Spine connection indicator */}
            <line x1="78" y1="60" x2="82" y2="60" stroke="#f59e0b" strokeWidth="2" strokeDasharray="2,2" />
          </svg>
          <p style={{ fontSize: typo.label, color: colors.textMuted, textAlign: 'center', marginTop: '8px' }}>
            Flexible spine rotation
          </p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-purple-400 mb-2 text-center">Astronaut Method</h3>
          <svg width="180" height="120" className="mx-auto" style={{ overflow: 'visible' }}>
            <defs>
              {/* Astronaut suit gradient */}
              <linearGradient id="amtTwistSuit" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="30%" stopColor="#e2e8f0" />
                <stop offset="70%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>
              <radialGradient id="amtTwistHelmet" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="40%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#94a3b8" />
              </radialGradient>
              <radialGradient id="amtTwistVisor" cx="50%" cy="30%" r="60%">
                <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#0891b2" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#164e63" />
              </radialGradient>
              {/* Purple arrow gradient */}
              <linearGradient id="amtTwistArrowPurple" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="50%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#d8b4fe" />
              </linearGradient>
              <marker id="amtTwistArrowHeadPurple" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill="#c084fc" />
              </marker>
              <filter id="amtTwistPurpleGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Space background hint */}
            <circle cx="20" cy="20" r="1" fill="white" opacity="0.5" />
            <circle cx="160" cy="15" r="0.8" fill="white" opacity="0.4" />
            <circle cx="170" cy="80" r="1.2" fill="white" opacity="0.3" />
            {/* Astronaut with premium gradients */}
            <circle cx="90" cy="40" r="15" fill="url(#amtTwistHelmet)" stroke="#64748b" strokeWidth="1.5" />
            {/* Visor */}
            <ellipse cx="90" cy="42" rx="10" ry="8" fill="url(#amtTwistVisor)" />
            {/* Body */}
            <rect x="75" y="55" width="30" height="35" rx="5" fill="url(#amtTwistSuit)" stroke="#64748b" strokeWidth="1.5" />
            {/* Life support pack */}
            <rect x="78" y="58" width="8" height="12" rx="2" fill="#64748b" />
            <rect x="94" y="58" width="8" height="12" rx="2" fill="#64748b" />
            {/* Arms in asymmetric motion with gradients */}
            <line x1="75" y1="65" x2="45" y2="45" stroke="url(#amtTwistSuit)" strokeWidth="7" strokeLinecap="round" />
            <line x1="105" y1="65" x2="135" y2="85" stroke="url(#amtTwistSuit)" strokeWidth="7" strokeLinecap="round" />
            {/* Gloves */}
            <circle cx="45" cy="45" r="5" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
            <circle cx="135" cy="85" r="5" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
            {/* Motion lines for arm movement */}
            <path d="M50,50 Q55,45 60,48" fill="none" stroke="#a855f7" strokeWidth="1" opacity="0.5" />
            <path d="M130,80 Q125,85 120,82" fill="none" stroke="#a855f7" strokeWidth="1" opacity="0.5" />
            {/* Rotation arrow with glow */}
            <path d="M70,95 A40,40 0 0 0 110,95" fill="none" stroke="url(#amtTwistArrowPurple)" strokeWidth="2.5" markerEnd="url(#amtTwistArrowHeadPurple)" filter="url(#amtTwistPurpleGlow)" />
          </svg>
          <p style={{ fontSize: typo.label, color: colors.textMuted, textAlign: 'center', marginTop: '8px' }}>
            Asymmetric arm circles
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-purple-400 mb-3">Astronaut Techniques:</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li><strong>Arm circles:</strong> Extend one arm, circle it while keeping the other tucked</li>
          <li><strong>Bicycle legs:</strong> Pedal legs in asymmetric patterns</li>
          <li><strong>Hula motion:</strong> Rotate hips while keeping shoulders fixed</li>
          <li><strong>Combination:</strong> Use all limbs in coordinated asymmetric patterns</li>
        </ul>
        <p className="text-cyan-400 mt-4 text-sm">
          It's slower than a cat (humans are less flexible), but the physics is identical!
        </p>
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300 relative"
      >
        Review the Discovery
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">Key Discovery</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Angular Momentum Transfer Is Universal!</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            Any object with movable parts can change its orientation without external forces by:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Moving parts to change moment of inertia distribution</li>
            <li>Rotating different sections at different rates</li>
            <li>Repeating with reversed configuration</li>
            <li>Accumulating net rotation over multiple cycles</li>
          </ol>
          <p className="text-emerald-400 font-medium mt-4">
            This works in space, underwater, in mid-air - anywhere! No magic required, just physics!
          </p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300 relative"
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  const applications = [
    {
      title: "Diving & Gymnastics",
      icon: "Diving",
      description: "Divers and gymnasts use asymmetric arm and leg movements to control twists in mid-air.",
      details: "A diver can initiate a twist after leaving the board by dropping one shoulder and asymmetrically moving their arms. The same physics that rights a cat allows them to add rotations!",
      animation: (
        <div style={{ position: 'relative' }}>
          <svg width="200" height="130" className="mx-auto" style={{ overflow: 'visible' }}>
            <defs>
              {/* Water gradient */}
              <linearGradient id="amtAppWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.8" />
              </linearGradient>
              {/* Platform gradient */}
              <linearGradient id="amtAppPlatformGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="50%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
              {/* Skin gradient */}
              <radialGradient id="amtAppSkinGrad" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="50%" stopColor="#fcd9b6" />
                <stop offset="100%" stopColor="#f5c89a" />
              </radialGradient>
              {/* Twist arrow gradient */}
              <linearGradient id="amtAppTwistGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="50%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#d8b4fe" />
              </linearGradient>
              {/* Glow filter */}
              <filter id="amtAppGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Water with gradient */}
            <rect x="0" y="100" width="200" height="30" fill="url(#amtAppWaterGrad)" rx="3" />
            {/* Water surface ripples */}
            <path d="M0,102 Q25,100 50,102 Q75,104 100,102 Q125,100 150,102 Q175,104 200,102" fill="none" stroke="white" strokeWidth="0.5" opacity="0.4" />
            {/* Platform with gradient */}
            <rect x="5" y="15" width="45" height="10" rx="2" fill="url(#amtAppPlatformGrad)" />
            <rect x="5" y="15" width="45" height="2" fill="#cbd5e1" opacity="0.5" />
            {/* Platform support */}
            <rect x="20" y="25" width="15" height="75" fill="url(#amtAppPlatformGrad)" />
            {/* Diver 1 - on platform */}
            <g transform="translate(35, 38)">
              <ellipse cx="0" cy="0" rx="5" ry="12" fill="url(#amtAppSkinGrad)" />
              <circle cx="0" cy="-16" r="6" fill="url(#amtAppSkinGrad)" />
              <line x1="-5" y1="-5" x2="-15" y2="-12" stroke="url(#amtAppSkinGrad)" strokeWidth="3" strokeLinecap="round" />
              <line x1="5" y1="-5" x2="15" y2="2" stroke="url(#amtAppSkinGrad)" strokeWidth="3" strokeLinecap="round" />
            </g>
            {/* Diver 2 - mid-air twist */}
            <g transform="translate(90, 55) rotate(45)">
              <ellipse cx="0" cy="0" rx="5" ry="10" fill="url(#amtAppSkinGrad)" />
              <circle cx="0" cy="-14" r="5" fill="url(#amtAppSkinGrad)" />
              <line x1="-5" y1="0" x2="-12" y2="-8" stroke="url(#amtAppSkinGrad)" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="5" y1="0" x2="12" y2="5" stroke="url(#amtAppSkinGrad)" strokeWidth="2.5" strokeLinecap="round" />
            </g>
            {/* Diver 3 - entering water */}
            <g transform="translate(150, 85) rotate(160)">
              <ellipse cx="0" cy="0" rx="4" ry="10" fill="url(#amtAppSkinGrad)" />
              <circle cx="0" cy="-13" r="5" fill="url(#amtAppSkinGrad)" />
            </g>
            {/* Twist arrows with glow */}
            <path d="M65,45 Q80,35 95,50" fill="none" stroke="url(#amtAppTwistGrad)" strokeWidth="2.5" filter="url(#amtAppGlow)" />
            <path d="M115,60 Q130,55 145,70" fill="none" stroke="url(#amtAppTwistGrad)" strokeWidth="2" filter="url(#amtAppGlow)" />
            {/* Splash effect */}
            <path d="M145,98 Q150,92 155,98" fill="none" stroke="white" strokeWidth="1" opacity="0.6" />
            <path d="M150,96 L150,90" stroke="white" strokeWidth="1" opacity="0.5" />
          </svg>
          <p style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', marginTop: '4px' }}>
            Asymmetric arms add twist
          </p>
        </div>
      )
    },
    {
      title: "Space Operations",
      icon: "Space",
      description: "Astronauts use self-rotation techniques during spacewalks and inside spacecraft.",
      details: "NASA trains astronauts in these maneuvers in underwater neutral buoyancy facilities. During EVAs, being able to reorient without grabbing anything can be crucial for safety.",
      animation: (
        <div style={{ position: 'relative' }}>
          <svg width="200" height="130" className="mx-auto" style={{ overflow: 'visible' }}>
            <defs>
              {/* Space background gradient */}
              <linearGradient id="amtAppSpaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="50%" stopColor="#1e1b4b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              {/* Station module gradient */}
              <linearGradient id="amtAppStationGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="30%" stopColor="#94a3b8" />
                <stop offset="70%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
              {/* Astronaut suit gradient */}
              <linearGradient id="amtAppAstroSuit" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="30%" stopColor="#e2e8f0" />
                <stop offset="70%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>
              {/* Visor gradient */}
              <radialGradient id="amtAppVisorGrad" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#d97706" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#92400e" />
              </radialGradient>
              {/* Rotation arrow gradient */}
              <linearGradient id="amtAppRotateGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="50%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#86efac" />
              </linearGradient>
              <marker id="amtAppArrowGreen" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#4ade80" />
              </marker>
              <filter id="amtAppStarGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="1" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Space background */}
            <rect x="0" y="0" width="200" height="130" fill="url(#amtAppSpaceGrad)" rx="4" />
            {/* Stars with glow */}
            {[
              { x: 15, y: 20, r: 1.2 }, { x: 45, y: 10, r: 0.8 }, { x: 80, y: 25, r: 1 },
              { x: 170, y: 15, r: 1.3 }, { x: 185, y: 45, r: 0.9 }, { x: 160, y: 110, r: 1.1 },
              { x: 10, y: 80, r: 0.7 }, { x: 30, y: 115, r: 1 }, { x: 95, y: 5, r: 0.8 }
            ].map((star, i) => (
              <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="white" filter="url(#amtAppStarGlow)" />
            ))}
            {/* Space station modules */}
            <rect x="0" y="40" width="55" height="45" rx="3" fill="url(#amtAppStationGrad)" />
            <rect x="55" y="32" width="75" height="60" rx="4" fill="url(#amtAppStationGrad)" />
            {/* Solar panel */}
            <rect x="60" y="8" width="25" height="20" fill="#1e3a5f" stroke="#475569" strokeWidth="1" />
            <rect x="60" y="96" width="25" height="20" fill="#1e3a5f" stroke="#475569" strokeWidth="1" />
            {/* Panel lines */}
            <line x1="65" y1="8" x2="65" y2="28" stroke="#334155" strokeWidth="0.5" />
            <line x1="72" y1="8" x2="72" y2="28" stroke="#334155" strokeWidth="0.5" />
            <line x1="80" y1="8" x2="80" y2="28" stroke="#334155" strokeWidth="0.5" />
            {/* Module windows */}
            <circle cx="25" cy="62" r="6" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
            <circle cx="90" cy="55" r="8" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
            <circle cx="90" cy="75" r="6" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
            {/* Astronaut floating */}
            <g transform="translate(145, 60)">
              {/* Helmet */}
              <circle cx="0" cy="-12" r="10" fill="url(#amtAppAstroSuit)" stroke="#64748b" strokeWidth="1" />
              <ellipse cx="0" cy="-10" rx="7" ry="5" fill="url(#amtAppVisorGrad)" />
              {/* Body */}
              <rect x="-8" y="-2" width="16" height="24" rx="3" fill="url(#amtAppAstroSuit)" stroke="#64748b" strokeWidth="1" />
              {/* Life support */}
              <rect x="-6" y="0" width="5" height="8" rx="1" fill="#64748b" />
              <rect x="1" y="0" width="5" height="8" rx="1" fill="#64748b" />
              {/* Arms asymmetric */}
              <line x1="-8" y1="5" x2="-22" y2="-5" stroke="url(#amtAppAstroSuit)" strokeWidth="5" strokeLinecap="round" />
              <line x1="8" y1="5" x2="22" y2="15" stroke="url(#amtAppAstroSuit)" strokeWidth="5" strokeLinecap="round" />
              {/* Gloves */}
              <circle cx="-22" cy="-5" r="4" fill="#e2e8f0" />
              <circle cx="22" cy="15" r="4" fill="#e2e8f0" />
            </g>
            {/* Rotation arrow with glow */}
            <path d="M125,80 A25,25 0 0 1 165,80" fill="none" stroke="url(#amtAppRotateGrad)" strokeWidth="2.5" markerEnd="url(#amtAppArrowGreen)" filter="url(#amtAppStarGlow)" />
          </svg>
          <p style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', marginTop: '4px' }}>
            Self-rotation in microgravity
          </p>
        </div>
      )
    },
    {
      title: "Falling Robots",
      icon: "Robot",
      description: "Aerial drones and falling robots use reaction wheels and limb movements to self-right.",
      details: "Boston Dynamics robots use rapid limb movements to reorient during falls. Some drones have internal reaction wheels that spin up to control orientation without aerodynamic surfaces.",
      animation: (
        <div style={{ position: 'relative' }}>
          <svg width="200" height="130" className="mx-auto" style={{ overflow: 'visible' }}>
            <defs>
              {/* Robot body gradient */}
              <linearGradient id="amtAppRobotBody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="30%" stopColor="#64748b" />
                <stop offset="70%" stopColor="#475569" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
              {/* Robot limb gradient */}
              <linearGradient id="amtAppRobotLimb" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#cbd5e1" />
                <stop offset="50%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>
              {/* Screen gradient */}
              <linearGradient id="amtAppScreen" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              {/* Eye glow */}
              <radialGradient id="amtAppEyeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="50%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#16a34a" />
              </radialGradient>
              {/* Reaction wheel gradient */}
              <radialGradient id="amtAppWheelGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </radialGradient>
              {/* Arrow gradient */}
              <linearGradient id="amtAppOrangeArrow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
              <marker id="amtAppArrowOrange" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#fbbf24" />
              </marker>
              <filter id="amtAppRobotGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Robot body */}
            <rect x="70" y="30" width="60" height="50" rx="6" fill="url(#amtAppRobotBody)" />
            {/* Body highlight */}
            <rect x="72" y="32" width="56" height="3" rx="1" fill="#cbd5e1" opacity="0.4" />
            {/* Screen face */}
            <rect x="78" y="40" width="44" height="28" rx="3" fill="url(#amtAppScreen)" />
            {/* Eyes with glow */}
            <circle cx="90" cy="52" r="4" fill="url(#amtAppEyeGlow)" filter="url(#amtAppRobotGlow)" />
            <circle cx="110" cy="52" r="4" fill="url(#amtAppEyeGlow)" filter="url(#amtAppRobotGlow)" />
            {/* Eye highlights */}
            <circle cx="88" cy="50" r="1" fill="white" opacity="0.8" />
            <circle cx="108" cy="50" r="1" fill="white" opacity="0.8" />
            {/* Reaction wheel inside body */}
            <circle cx="100" cy="72" r="6" fill="url(#amtAppWheelGrad)" filter="url(#amtAppRobotGlow)">
              <animateTransform attributeName="transform" type="rotate" from="0 100 72" to="360 100 72" dur="0.5s" repeatCount="indefinite" />
            </circle>
            {/* Limbs in asymmetric motion */}
            <line x1="70" y1="50" x2="38" y2="22" stroke="url(#amtAppRobotLimb)" strokeWidth="7" strokeLinecap="round" />
            <line x1="130" y1="50" x2="162" y2="78" stroke="url(#amtAppRobotLimb)" strokeWidth="7" strokeLinecap="round" />
            <line x1="85" y1="80" x2="72" y2="110" stroke="url(#amtAppRobotLimb)" strokeWidth="7" strokeLinecap="round" />
            <line x1="115" y1="80" x2="128" y2="110" stroke="url(#amtAppRobotLimb)" strokeWidth="7" strokeLinecap="round" />
            {/* Hand/foot joints */}
            <circle cx="38" cy="22" r="5" fill="#64748b" />
            <circle cx="162" cy="78" r="5" fill="#64748b" />
            <circle cx="72" cy="110" r="5" fill="#64748b" />
            <circle cx="128" cy="110" r="5" fill="#64748b" />
            {/* Rotation indicator */}
            <path d="M35,65 Q48,85 68,75" fill="none" stroke="url(#amtAppOrangeArrow)" strokeWidth="2.5" markerEnd="url(#amtAppArrowOrange)" filter="url(#amtAppRobotGlow)" />
          </svg>
          <p style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', marginTop: '4px' }}>
            Rapid limb adjustment with reaction wheel
          </p>
        </div>
      )
    },
    {
      title: "Ice Skating Spins",
      icon: "Skating",
      description: "Skaters use arm and leg positions not just for speed, but also to initiate and control twist direction.",
      details: "A skater can start a spin in one direction, then use asymmetric arm movements to reverse it or add twisting rotations - all through angular momentum transfer between body parts.",
      animation: (
        <div style={{ position: 'relative' }}>
          <svg width="200" height="130" className="mx-auto" style={{ overflow: 'visible' }}>
            <defs>
              {/* Ice gradient */}
              <radialGradient id="amtAppIceGrad" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#bae6fd" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.3" />
              </radialGradient>
              {/* Skin gradient */}
              <radialGradient id="amtAppSkaterSkin" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="50%" stopColor="#fcd9b6" />
                <stop offset="100%" stopColor="#f5c89a" />
              </radialGradient>
              {/* Dress gradient */}
              <linearGradient id="amtAppDressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="30%" stopColor="#ec4899" />
                <stop offset="70%" stopColor="#db2777" />
                <stop offset="100%" stopColor="#be185d" />
              </linearGradient>
              {/* Spin trail gradient */}
              <linearGradient id="amtAppSpinTrail" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0" />
                <stop offset="50%" stopColor="#c084fc" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#d8b4fe" stopOpacity="0.8" />
              </linearGradient>
              <filter id="amtAppSpinGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Ice sparkle filter */}
              <filter id="amtAppSparkle">
                <feGaussianBlur stdDeviation="0.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Ice rink */}
            <ellipse cx="100" cy="115" rx="90" ry="18" fill="url(#amtAppIceGrad)" />
            {/* Ice reflection/sparkles */}
            <circle cx="60" cy="112" r="1" fill="white" filter="url(#amtAppSparkle)" opacity="0.6" />
            <circle cx="120" cy="118" r="1.2" fill="white" filter="url(#amtAppSparkle)" opacity="0.5" />
            <circle cx="150" cy="110" r="0.8" fill="white" filter="url(#amtAppSparkle)" opacity="0.7" />
            <circle cx="40" cy="115" r="1" fill="white" filter="url(#amtAppSparkle)" opacity="0.4" />
            {/* Spin trail effect */}
            <ellipse cx="100" cy="70" rx="45" ry="35" fill="none" stroke="url(#amtAppSpinTrail)" strokeWidth="3" strokeDasharray="8 4" filter="url(#amtAppSpinGlow)" opacity="0.7">
              <animateTransform attributeName="transform" type="rotate" from="0 100 70" to="360 100 70" dur="2s" repeatCount="indefinite" />
            </ellipse>
            {/* Skater */}
            {/* Hair */}
            <ellipse cx="100" cy="32" rx="10" ry="8" fill="#7c3aed" />
            {/* Head */}
            <circle cx="100" cy="38" r="10" fill="url(#amtAppSkaterSkin)" />
            {/* Face details */}
            <circle cx="96" cy="37" r="1.5" fill="#1e293b" />
            <circle cx="104" cy="37" r="1.5" fill="#1e293b" />
            <ellipse cx="100" cy="42" rx="2" ry="1" fill="#f87171" />
            {/* Body/dress */}
            <ellipse cx="100" cy="68" rx="14" ry="22" fill="url(#amtAppDressGrad)" />
            {/* Dress sparkles */}
            <circle cx="95" cy="60" r="1" fill="white" opacity="0.6" />
            <circle cx="105" cy="70" r="0.8" fill="white" opacity="0.5" />
            <circle cx="98" cy="80" r="1" fill="white" opacity="0.4" />
            {/* Arms asymmetric */}
            <line x1="86" y1="55" x2="52" y2="35" stroke="url(#amtAppSkaterSkin)" strokeWidth="5" strokeLinecap="round" />
            <line x1="114" y1="55" x2="135" y2="72" stroke="url(#amtAppSkaterSkin)" strokeWidth="5" strokeLinecap="round" />
            {/* Hands */}
            <circle cx="52" cy="35" r="4" fill="url(#amtAppSkaterSkin)" />
            <circle cx="135" cy="72" r="4" fill="url(#amtAppSkaterSkin)" />
            {/* Skating leg */}
            <line x1="100" y1="90" x2="100" y2="108" stroke="url(#amtAppSkaterSkin)" strokeWidth="5" strokeLinecap="round" />
            {/* Skate blade */}
            <path d="M95,108 L105,108 Q108,108 108,110 L92,110 Q92,108 95,108" fill="#94a3b8" />
            <line x1="92" y1="110" x2="108" y2="110" stroke="#64748b" strokeWidth="1.5" />
          </svg>
          <p style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', marginTop: '4px' }}>
            Asymmetric arms control twist direction
          </p>
        </div>
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
            className={`px-4 py-2 rounded-lg font-medium transition-all relative ${
              activeAppTab === index
                ? 'bg-orange-600 text-white'
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.title.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xl font-bold text-white">{applications[activeAppTab].title}</h3>
        </div>

        {applications[activeAppTab].animation}

        <p className="text-lg text-slate-300 mt-4 mb-3">
          {applications[activeAppTab].description}
        </p>
        <p className="text-sm text-slate-400">
          {applications[activeAppTab].details}
        </p>

        {!completedApps.has(activeAppTab) ? (
          <button
            onClick={() => handleAppComplete(activeAppTab)}
            style={{ zIndex: 10 }}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors relative"
          >
            Mark as Understood
          </button>
        ) : (
          <button
            onClick={() => {
              const nextIncomplete = applications.findIndex((_, i) => !completedApps.has(i));
              if (nextIncomplete !== -1) {
                setActiveAppTab(nextIncomplete);
              }
            }}
            style={{ zIndex: 10 }}
            className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors relative"
          >
            Next Application
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
          className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300 relative"
        >
          Take the Knowledge Test
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
              <p className="text-white font-medium mb-3">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    style={{ zIndex: 10 }}
                    className={`p-3 rounded-lg text-left text-sm transition-all relative ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-orange-600 text-white'
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
            onClick={() => setShowTestResults(true)}
            disabled={testAnswers.includes(-1)}
            style={{ zIndex: 10 }}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all relative ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-500 hover:to-amber-500'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? 'Excellent!' : 'Keep Learning'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Score: {calculateScore()}/10
          </h3>
          <p className="text-slate-300 mb-6">
            {calculateScore() >= 7
              ? 'Excellent! You have mastered angular momentum transfer!'
              : 'Keep studying! Review the concepts and try again.'}
          </p>

          {calculateScore() >= 7 ? (
            <button
              onClick={() => goToPhase('mastery')}
              style={{ zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300 relative"
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onClick={() => { setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase('review'); }}
              style={{ zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300 relative"
            >
              Review and Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-orange-900/50 via-amber-900/50 to-yellow-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">Congratulations!</div>
        <h1 className="text-3xl font-bold text-white mb-4">Angular Momentum Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You have mastered the physics of angular momentum transfer and the cat righting reflex!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">Rotation</div>
            <p className="text-sm text-slate-300">Momentum Transfer</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">Cat</div>
            <p className="text-sm text-slate-300">Righting Reflex</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">Space</div>
            <p className="text-sm text-slate-300">Space Maneuvers</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">Balance</div>
            <p className="text-sm text-slate-300">Moment of Inertia</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => goToPhase('hook')}
            style={{ zIndex: 10 }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors relative"
          >
            Explore Again
          </button>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // REAL-WORLD APPLICATIONS DATA
  // ─────────────────────────────────────────────────────────────────────────
  const realWorldApps = [
    {
      icon: '🛰️',
      title: 'Reaction Wheels in Spacecraft',
      short: 'Satellite Pointing',
      tagline: 'Precision Control Without Propellant',
      description: 'Reaction wheels are spinning flywheels used to control spacecraft orientation without using thrusters. By accelerating or decelerating these internal wheels, satellites can rotate with extreme precision to point cameras, antennas, and solar panels exactly where needed.',
      connection: 'When a reaction wheel spins faster, the spacecraft rotates in the opposite direction to conserve total angular momentum. This internal transfer of angular momentum allows precise attitude control without expending fuel.',
      howItWorks: 'A typical spacecraft has 3-4 reaction wheels oriented along different axes. Electric motors speed up or slow down each wheel, causing equal and opposite rotation of the spacecraft body. The Hubble Space Telescope uses six reaction wheels to achieve pointing accuracy of 0.007 arcseconds - precise enough to hold a laser on a dime 200 miles away.',
      stats: [
        { value: '0.007"', label: 'Arcsecond Accuracy', icon: '🎯' },
        { value: '6,000', label: 'RPM Max Speed', icon: '⚡' },
        { value: '15+', label: 'Years Lifespan', icon: '🔋' }
      ],
      examples: [
        'Hubble Space Telescope imaging distant galaxies',
        'GPS satellites maintaining precise Earth orientation',
        'Earth observation satellites tracking ground targets',
        'Deep space probes pointing antennas toward Earth'
      ],
      companies: ['NASA', 'SpaceX', 'Lockheed Martin', 'Northrop Grumman', 'Boeing'],
      futureImpact: 'Next-generation reaction wheels using magnetic bearings will enable even longer missions and more precise pointing for exoplanet detection and gravitational wave observatories.',
      color: '#3b82f6'
    },
    {
      icon: '🚁',
      title: 'Helicopter Tail Rotors',
      short: 'Torque Compensation',
      tagline: 'Fighting Physics to Fly Straight',
      description: 'The main rotor of a helicopter generates enormous torque that would spin the fuselage in the opposite direction. The tail rotor provides a sideways thrust that counteracts this torque, allowing pilots to control the heading and prevent uncontrolled rotation.',
      connection: 'As the main rotor spins, it imparts angular momentum to the air. By Newton\'s third law, the helicopter body experiences an equal and opposite torque. The tail rotor generates a force that creates a counter-torque, maintaining angular momentum balance.',
      howItWorks: 'The main rotor can produce over 50,000 lb-ft of torque. The tail rotor, typically spinning at 3-6x the main rotor speed, creates sideways thrust at the tail boom. Pilots control yaw by adjusting tail rotor blade pitch via foot pedals. Without it, the fuselage would spin at roughly 1/10th the main rotor speed.',
      stats: [
        { value: '50,000', label: 'lb-ft Main Torque', icon: '🔄' },
        { value: '10-15%', label: 'Power Consumed', icon: '⛽' },
        { value: '1,500', label: 'Tail Rotor RPM', icon: '💨' }
      ],
      examples: [
        'Medical evacuation helicopters in hover',
        'News helicopters maintaining steady shots',
        'Military Apaches during precision maneuvers',
        'Search and rescue hovering over survivors'
      ],
      companies: ['Bell', 'Sikorsky', 'Airbus Helicopters', 'Leonardo', 'Boeing'],
      futureImpact: 'NOTAR (No Tail Rotor) systems and electric tail rotors are emerging, using ducted fans and Coanda effect for quieter, safer anti-torque systems in urban air mobility vehicles.',
      color: '#10b981'
    },
    {
      icon: '🐱',
      title: 'Cat Righting Reflex',
      short: 'Biomechanics',
      tagline: 'Nature\'s Angular Momentum Master',
      description: 'Cats possess an innate ability to reorient themselves during a fall to land on their feet, even with zero initial angular momentum. This remarkable reflex involves a complex sequence of body shape changes that exploit angular momentum conservation.',
      connection: 'By bending at the spine and extending/tucking limbs asymmetrically, cats change the moment of inertia of their front and back halves independently. The half with lower moment of inertia rotates more, allowing net reorientation while total angular momentum remains zero.',
      howItWorks: 'The cat first bends its spine to separate front and back rotation axes. It then tucks front legs (low I) and extends back legs (high I), rotating the front half quickly. Next it reverses: extends front legs and tucks back legs to rotate the back half. The whole sequence takes about 0.3 seconds and requires only 30cm of falling distance.',
      stats: [
        { value: '0.3s', label: 'Reflex Duration', icon: '⏱️' },
        { value: '30cm', label: 'Minimum Height', icon: '📏' },
        { value: '180°', label: 'Max Rotation', icon: '🔃' }
      ],
      examples: [
        'Cats falling from trees and windowsills',
        'Kittens learning the reflex at 3-4 weeks',
        'Inspired robotic self-righting mechanisms',
        'Studied by NASA for astronaut training'
      ],
      companies: ['MIT Biomechanics Lab', 'Boston Dynamics', 'NASA', 'Stanford Robotics', 'ETH Zurich'],
      futureImpact: 'Cat-inspired algorithms are being developed for drones and robots to self-right after falls, and for designing safer wearable airbag systems for elderly fall protection.',
      color: '#f97316'
    },
    {
      icon: '🏊',
      title: 'Diver Twist Technique',
      short: 'Sports Physics',
      tagline: 'Adding Rotation in Mid-Air',
      description: 'Elite divers can initiate twisting rotations after leaving the springboard, even when they push off with zero twist. This "cat twist" technique allows them to add complex multi-twist maneuvers to their dives, dramatically increasing difficulty scores.',
      connection: 'Like cats, divers use asymmetric limb movements to transfer angular momentum between body parts. By dropping one shoulder and moving arms asymmetrically, they create twist while conserving total angular momentum in the somersault direction.',
      howItWorks: 'A diver initiates twist by tilting their body axis (dropping one shoulder) while somersaulting. Asymmetric arm positions - one wrapped, one extended - create different moments of inertia. The body naturally rotates toward the side with lower moment of inertia. Top divers can add 3-4 twists to a 3.5 somersault dive this way.',
      stats: [
        { value: '4.5', label: 'Max Twists Added', icon: '🌀' },
        { value: '1.8s', label: 'Flight Time 10m', icon: '⏱️' },
        { value: '34mph', label: 'Entry Speed', icon: '💨' }
      ],
      examples: [
        'Olympic platform diving 10m events',
        'Springboard diving 3m competitions',
        'Cliff diving from 27m heights',
        'Synchronized diving pair coordination'
      ],
      companies: ['USA Diving', 'FINA', 'Red Bull Cliff Diving', 'British Diving', 'Chinese Diving Team'],
      futureImpact: 'Motion capture and AI analysis are helping divers optimize their twist initiation timing, potentially enabling new dive combinations previously thought impossible.',
      color: '#8b5cf6'
    }
  ];

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

  const phaseIndex = phaseOrder.indexOf(phase);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-600/3 rounded-full blur-3xl" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-orange-400">Angular Momentum</span>
          <div className="flex gap-1.5">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 relative ${
                  phase === p ? 'bg-orange-500 w-6' : phaseIndex > i ? 'bg-emerald-500 w-2' : 'bg-slate-600 w-2'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm text-slate-400 font-medium">{phaseLabels[phase]}</span>
        </div>
      </div>

      <div className="relative z-10 pt-16 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default AngularMomentumTransferRenderer;
