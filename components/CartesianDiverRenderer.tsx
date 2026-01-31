'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// CARTESIAN DIVER RENDERER - BUOYANCY & PRESSURE
// Premium 10-phase educational game with premium design
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

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
// GAME CONTENT DATA
// ============================================================================

const predictions = {
  initial: {
    question: "You have a sealed plastic bottle filled with water and a small dropper with an air bubble inside. When you squeeze the bottle hard, what happens to the dropper?",
    options: [
      { id: 'A', text: 'Nothing - it stays in place', correct: false },
      { id: 'B', text: 'It rises to the top', correct: false },
      { id: 'C', text: 'It sinks to the bottom', correct: true },
      { id: 'D', text: 'It spins around', correct: false },
    ],
    explanation: "When you squeeze the bottle, you increase the pressure throughout the water. This compresses the air bubble inside the dropper (Boyle's Law: PV = constant). With less air volume, the dropper displaces less water, reducing its buoyancy. When buoyancy becomes less than its weight, it sinks!"
  },
  twist: {
    question: "Now imagine you have three divers with different amounts of trapped air. One has a large air bubble, one medium, and one small. You squeeze the bottle gently. Which diver sinks first?",
    options: [
      { id: 'A', text: 'The diver with the large air bubble', correct: false },
      { id: 'B', text: 'The diver with the medium air bubble', correct: false },
      { id: 'C', text: 'The diver with the small air bubble', correct: true },
      { id: 'D', text: 'They all sink at exactly the same time', correct: false },
    ],
    explanation: "The diver with the smallest air bubble has the least margin of buoyancy. When pressure increases, all bubbles compress proportionally, but the smallest bubble loses its buoyancy first. This is why submarines must carefully calibrate their ballast - too little reserve buoyancy and they sink unexpectedly!"
  }
};

const realWorldApplications = [
  {
    id: 'submarines',
    title: 'Submarines',
    icon: '🚢',
    subtitle: 'Controlling buoyancy with ballast tanks',
    description: 'Submarines use the same principle as Cartesian divers! They have ballast tanks that can be filled with water (to sink) or compressed air (to rise). By precisely controlling the air/water ratio, submarines can hover at any depth.',
    formula: 'Buoyancy = rho_water x V_displaced x g = Weight for neutral buoyancy',
    realExample: 'A nuclear submarine can hover motionless at 300m depth by precisely balancing its ballast tanks. Even a 1% change in buoyancy can cause unwanted depth changes.',
  },
  {
    id: 'fish',
    title: 'Fish Swim Bladders',
    icon: '🐟',
    subtitle: "Nature's buoyancy control",
    description: 'Most bony fish have a swim bladder - an internal gas-filled organ they can inflate or deflate. By adjusting the gas volume, fish control their buoyancy without constantly swimming, saving precious energy.',
    formula: 'Fish adjusts V_bladder to match: rho_fish x V_fish = rho_water x V_fish',
    realExample: 'Goldfish can hover motionless by fine-tuning their swim bladder. Deep-sea fish must be brought up slowly or their swim bladder expands dangerously!',
  },
  {
    id: 'scuba',
    title: 'Scuba BCDs',
    icon: '🤿',
    subtitle: 'BCD and pressure at depth',
    description: 'Scuba divers wear a BCD (Buoyancy Control Device) - an inflatable vest. As divers descend, increasing water pressure compresses air in their BCD, requiring them to add more air to maintain neutral buoyancy.',
    formula: 'P1V1 = P2V2 - At 10m depth, air volume halves!',
    realExample: 'At 30m depth (4 atm), a diver needs 4x as much air in their BCD as at the surface to maintain the same buoyancy. This is why proper buoyancy control is a critical diving skill.',
  },
  {
    id: 'balloons',
    title: 'Hot Air Balloons',
    icon: '🎈',
    subtitle: 'Density and atmospheric buoyancy',
    description: 'Hot air balloons work on the same principle but in air instead of water. Heating the air inside makes it less dense than surrounding cool air, creating buoyancy. The pilot controls altitude by adjusting the burner.',
    formula: 'Lift = (rho_cold - rho_hot) x V_balloon x g',
    realExample: 'A typical hot air balloon holds 77,000 cubic feet of air heated to 100C above ambient temperature, generating about 200 lbs of lift per 1000 cubic feet.',
  }
];

const quizQuestions = [
  {
    question: "What happens to the air bubble in a Cartesian diver when you squeeze the bottle?",
    options: [
      { text: "It expands", correct: false },
      { text: "It compresses (gets smaller)", correct: true },
      { text: "It stays the same size", correct: false },
      { text: "It turns into water", correct: false },
    ],
  },
  {
    question: "What gas law explains why the air bubble changes size under pressure?",
    options: [
      { text: "Newton's Law", correct: false },
      { text: "Ohm's Law", correct: false },
      { text: "Boyle's Law (PV = constant)", correct: true },
      { text: "Murphy's Law", correct: false },
    ],
  },
  {
    question: "Why does compressing the air bubble make the diver sink?",
    options: [
      { text: "The diver gets heavier", correct: false },
      { text: "Less displaced water means less buoyant force", correct: true },
      { text: "The water pushes it down", correct: false },
      { text: "Air becomes heavier under pressure", correct: false },
    ],
  },
  {
    question: "What is the condition for neutral buoyancy (floating at a fixed depth)?",
    options: [
      { text: "Object must be hollow", correct: false },
      { text: "Object density equals water density", correct: true },
      { text: "Object must be made of plastic", correct: false },
      { text: "Water must be cold", correct: false },
    ],
  },
  {
    question: "How do submarines control their depth?",
    options: [
      { text: "By spinning propellers faster", correct: false },
      { text: "By adjusting ballast tanks (water vs air)", correct: true },
      { text: "By changing shape", correct: false },
      { text: "By heating the water around them", correct: false },
    ],
  },
  {
    question: "At 10 meters underwater, how does pressure compare to the surface?",
    options: [
      { text: "Same pressure", correct: false },
      { text: "About double (2 atm total)", correct: true },
      { text: "Ten times higher", correct: false },
      { text: "Half the pressure", correct: false },
    ],
  },
  {
    question: "Why do scuba divers need to add air to their BCD as they descend?",
    options: [
      { text: "To breathe easier", correct: false },
      { text: "To compensate for air compression from increased pressure", correct: true },
      { text: "To stay warm", correct: false },
      { text: "To see better", correct: false },
    ],
  },
  {
    question: "What does a fish's swim bladder do?",
    options: [
      { text: "Helps the fish breathe", correct: false },
      { text: "Stores food", correct: false },
      { text: "Controls buoyancy by adjusting gas volume", correct: true },
      { text: "Makes the fish swim faster", correct: false },
    ],
  },
  {
    question: "If you have three divers with different bubble sizes, which sinks first when you squeeze gently?",
    options: [
      { text: "The one with the largest bubble", correct: false },
      { text: "The one with the smallest bubble", correct: true },
      { text: "They all sink at exactly the same rate", correct: false },
      { text: "The one in the middle of the bottle", correct: false },
    ],
  },
  {
    question: "Why can't deep-sea fish survive if brought to the surface quickly?",
    options: [
      { text: "They get cold", correct: false },
      { text: "It's too bright", correct: false },
      { text: "Their swim bladder expands rapidly and can rupture", correct: true },
      { text: "They can't breathe surface air", correct: false },
    ],
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CartesianDiverRenderer: React.FC<Props> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
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

  // Interactive state for simulation
  const [pressure, setPressure] = useState(1.0);
  const [diverPosition, setDiverPosition] = useState(0.3);
  const [diverVelocity, setDiverVelocity] = useState(0);
  const [showForces, setShowForces] = useState(true);
  const [isSqueezing, setIsSqueezing] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);

  // Twist play state - multiple divers
  const [diver1Pos, setDiver1Pos] = useState(0.25);
  const [diver2Pos, setDiver2Pos] = useState(0.3);
  const [diver3Pos, setDiver3Pos] = useState(0.35);
  const [twistPressure, setTwistPressure] = useState(1.0);
  const [isTwistSqueezing, setIsTwistSqueezing] = useState(false);

  const lastClickRef = useRef(0);
  const animationRef = useRef<number>();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Premium Design System
  const colors = {
    primary: '#3b82f6',       // blue-500 (water)
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
    borderLight: '#475569',   // slate-600
    // Theme-specific
    water: '#3b82f6',         // blue-500
    diver: '#f97316',         // orange-500
    pressure: '#ef4444',      // red-500
    buoyancy: '#22c55e',      // green-500
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

  // Phase sync from props
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  const emit = useCallback((type: string, details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      type,
      gameType: 'cartesian_diver',
      gameTitle: 'Cartesian Diver',
      details: { phase, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase]);

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
    onPhaseComplete?.(newPhase);
    emit('phase_change', { phase: newPhase });

    // Reset simulation for certain phases
    if (newPhase === 'play') {
      setPressure(1.0);
      setDiverPosition(0.3);
      setDiverVelocity(0);
    } else if (newPhase === 'twist_play') {
      setTwistPressure(1.0);
      setDiver1Pos(0.25);
      setDiver2Pos(0.3);
      setDiver3Pos(0.35);
    }
  }, [playSound, onPhaseComplete, emit]);

  // Calculate bubble size based on pressure
  const calculateBubbleSize = useCallback((p: number, baseBubble: number = 1.0) => {
    return baseBubble * (1.0 / p);
  }, []);

  const bubbleSize = calculateBubbleSize(pressure);

  // Calculate buoyancy
  const calculateNetForce = useCallback((bubbleVol: number) => {
    const buoyancy = (bubbleVol - 0.85) * 2.0;
    return buoyancy;
  }, []);

  // Physics simulation for main diver
  useEffect(() => {
    const simulate = () => {
      setAnimationTime(t => t + 0.016);

      setDiverPosition(pos => {
        setDiverVelocity(vel => {
          const netForce = calculateNetForce(bubbleSize);
          const gravity = 0.001;
          const drag = 0.95;

          let newVel = (vel + netForce * 0.01 - gravity) * drag;
          newVel = Math.max(-0.02, Math.min(0.02, newVel));

          let newPos = pos - newVel;

          if (newPos < 0.05) {
            newPos = 0.05;
            newVel = Math.abs(newVel) * 0.3;
          }
          if (newPos > 0.9) {
            newPos = 0.9;
            newVel = -Math.abs(newVel) * 0.3;
          }

          return newVel;
        });

        return pos;
      });

      setDiverPosition(pos => {
        const newPos = pos - diverVelocity;
        return Math.max(0.05, Math.min(0.9, newPos));
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [bubbleSize, calculateNetForce, diverVelocity]);

  // Physics simulation for twist play (3 divers)
  useEffect(() => {
    if (phase !== 'twist_play') return;

    const simulate = () => {
      // Diver 1 - large bubble (1.2 base)
      const bubble1 = calculateBubbleSize(twistPressure, 1.2);
      const force1 = (bubble1 - 0.85) * 2.0;
      setDiver1Pos(pos => {
        const newPos = pos - force1 * 0.005;
        return Math.max(0.05, Math.min(0.9, newPos));
      });

      // Diver 2 - medium bubble (1.0 base)
      const bubble2 = calculateBubbleSize(twistPressure, 1.0);
      const force2 = (bubble2 - 0.85) * 2.0;
      setDiver2Pos(pos => {
        const newPos = pos - force2 * 0.005;
        return Math.max(0.05, Math.min(0.9, newPos));
      });

      // Diver 3 - small bubble (0.9 base)
      const bubble3 = calculateBubbleSize(twistPressure, 0.9);
      const force3 = (bubble3 - 0.85) * 2.0;
      setDiver3Pos(pos => {
        const newPos = pos - force3 * 0.005;
        return Math.max(0.05, Math.min(0.9, newPos));
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [phase, twistPressure, calculateBubbleSize]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'C' ? 'success' : 'failure');
    emit('prediction_made', { prediction, correct: prediction === 'C' });
  }, [playSound, emit]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'success' : 'failure');
    emit('twist_prediction_made', { prediction, correct: prediction === 'C' });
  }, [playSound, emit]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    emit('test_answered', { questionIndex, answerIndex });
  }, [emit]);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    emit('app_explored', { appIndex, app: realWorldApplications[appIndex].title });
  }, [playSound, emit]);

  const handleSqueezeStart = useCallback(() => {
    setIsSqueezing(true);
    setPressure(1.5);
  }, []);

  const handleSqueezeEnd = useCallback(() => {
    setIsSqueezing(false);
    setPressure(1.0);
  }, []);

  const handleTwistSqueezeStart = useCallback(() => {
    setIsTwistSqueezing(true);
    setTwistPressure(1.3);
  }, []);

  const handleTwistSqueezeEnd = useCallback(() => {
    setIsTwistSqueezing(false);
    setTwistPressure(1.0);
  }, []);

  const calculateScore = () => testAnswers.reduce((score, answer, index) => score + (answer >= 0 && quizQuestions[index].options[answer]?.correct ? 1 : 0), 0);
  const netForce = calculateNetForce(bubbleSize);

  // ============================================================================
  // DIVER SIMULATION VISUALIZATION
  // ============================================================================

  const renderDiverSimulation = () => {
    const simWidth = isMobile ? 320 : 400;
    const simHeight = 400;
    const bottleWidth = 120;
    const bottleHeight = 320;
    const bottleX = (simWidth - bottleWidth) / 2;
    const bottleY = 40;

    const diverY = bottleY + 30 + diverPosition * (bottleHeight - 80);
    const diverX = simWidth / 2;
    const bubbleRadius = 8 + bubbleSize * 12;

    return (
      <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-4 border border-slate-700/50">
        <svg width={simWidth} height={simHeight} className="mx-auto">
          <defs>
            {/* Premium water depth gradient with 6 color stops */}
            <linearGradient id="cartWaterDepth" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.7" />
              <stop offset="20%" stopColor="#0ea5e9" stopOpacity="0.75" />
              <stop offset="40%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#0369a1" stopOpacity="0.85" />
              <stop offset="80%" stopColor="#075985" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.95" />
            </linearGradient>

            {/* Premium glass bottle gradient with 5 color stops */}
            <linearGradient id="cartBottleGlass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.4" />
              <stop offset="25%" stopColor="#67e8f9" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.08" />
              <stop offset="75%" stopColor="#67e8f9" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#a5f3fc" stopOpacity="0.4" />
            </linearGradient>

            {/* Glass reflection highlight */}
            <linearGradient id="cartGlassHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Diver tube glass effect with 4 color stops */}
            <linearGradient id="cartDiverTube" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d1d5db" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#f3f4f6" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#f3f4f6" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#9ca3af" stopOpacity="0.9" />
            </linearGradient>

            {/* Diver cap gradient */}
            <radialGradient id="cartDiverCap" cx="40%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </radialGradient>

            {/* Air bubble gradient with glow */}
            <radialGradient id="cartAirBubble" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#e0f2fe" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#bae6fd" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.5" />
            </radialGradient>

            {/* Pressure arrow gradient */}
            <linearGradient id="cartPressureArrow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f472b6" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#ec4899" stopOpacity="1" />
              <stop offset="100%" stopColor="#f472b6" stopOpacity="0.3" />
            </linearGradient>

            {/* Buoyancy force gradient */}
            <linearGradient id="cartBuoyancyForce" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#4ade80" stopOpacity="1" />
            </linearGradient>

            {/* Weight force gradient */}
            <linearGradient id="cartWeightForce" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
            </linearGradient>

            {/* Ambient bubble glow filter */}
            <filter id="cartBubbleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Diver glow filter */}
            <filter id="cartDiverGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Pressure indicator glow */}
            <filter id="cartPressureGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Water surface shimmer */}
            <filter id="cartWaterShimmer" x="0%" y="0%" width="100%" height="100%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Bottle outline with glass effect */}
          <rect
            x={bottleX - (isSqueezing ? 5 : 0)}
            y={bottleY}
            width={bottleWidth + (isSqueezing ? 10 : 0)}
            height={bottleHeight}
            rx={20}
            fill="url(#cartBottleGlass)"
            stroke="#67e8f9"
            strokeWidth={2}
            style={{ transition: 'all 0.1s ease' }}
          />

          {/* Glass highlight reflection */}
          <rect
            x={bottleX + 5 - (isSqueezing ? 4 : 0)}
            y={bottleY + 5}
            width={15}
            height={bottleHeight - 30}
            rx={8}
            fill="url(#cartGlassHighlight)"
            style={{ transition: 'all 0.1s ease' }}
          />

          {/* Water inside bottle with depth gradient */}
          <rect
            x={bottleX + 5 - (isSqueezing ? 4 : 0)}
            y={bottleY + 10}
            width={bottleWidth - 10 + (isSqueezing ? 8 : 0)}
            height={bottleHeight - 20}
            rx={15}
            fill="url(#cartWaterDepth)"
            filter="url(#cartWaterShimmer)"
            style={{ transition: 'all 0.1s ease' }}
          />

          {/* Water surface highlight */}
          <ellipse
            cx={simWidth / 2}
            cy={bottleY + 18}
            rx={(bottleWidth - 20 + (isSqueezing ? 8 : 0)) / 2}
            ry={4}
            fill="#38bdf8"
            opacity={0.4}
            style={{ transition: 'all 0.1s ease' }}
          />

          {/* Animated bubbles with glow */}
          {[...Array(8)].map((_, i) => {
            const bubbleYPos = ((animationTime * 30 + i * 45) % (bottleHeight - 40)) + bottleY + 20;
            const bubbleXPos = bottleX + 20 + (i % 3) * 35 + Math.sin(animationTime * 2 + i) * 5;
            return (
              <circle
                key={i}
                cx={bubbleXPos}
                cy={bottleY + bottleHeight - (bubbleYPos - bottleY)}
                r={2 + (i % 3)}
                fill="url(#cartAirBubble)"
                filter="url(#cartBubbleGlow)"
                opacity={0.6}
              />
            );
          })}

          {/* The Diver with premium glass effect */}
          <g transform={`translate(${diverX}, ${diverY})`} filter="url(#cartDiverGlow)">
            {/* Diver tube body with glass effect */}
            <rect x={-8} y={-25} width={16} height={50} rx={4} fill="url(#cartDiverTube)" stroke="#9ca3af" strokeWidth={1} />

            {/* Glass tube highlight */}
            <rect x={-6} y={-23} width={4} height={46} rx={2} fill="white" opacity={0.3} />

            {/* Diver cap with gradient */}
            <ellipse cx={0} cy={-30} rx={10} ry={8} fill="url(#cartDiverCap)" />
            <ellipse cx={-3} cy={-32} rx={3} ry={2} fill="white" opacity={0.4} />

            {/* Air bubble inside diver with premium gradient */}
            <ellipse
              cx={0}
              cy={-5}
              rx={bubbleRadius * 0.5}
              ry={bubbleRadius}
              fill="url(#cartAirBubble)"
              filter="url(#cartBubbleGlow)"
            />

            {/* Bubble highlight */}
            <ellipse
              cx={-bubbleRadius * 0.15}
              cy={-5 - bubbleRadius * 0.3}
              rx={bubbleRadius * 0.15}
              ry={bubbleRadius * 0.25}
              fill="white"
              opacity={0.7}
            />

            {/* Weight at bottom */}
            <rect x={-3} y={25} width={6} height={8} rx={1} fill="#4b5563" stroke="#374151" strokeWidth={0.5} />
          </g>

          {/* Force arrows with gradients */}
          {showForces && (
            <g transform={`translate(${diverX + 40}, ${diverY})`}>
              {/* Buoyancy force arrow */}
              <line x1={0} y1={0} x2={0} y2={-netForce * 500} stroke="url(#cartBuoyancyForce)" strokeWidth={4} strokeLinecap="round" />
              <polygon
                points={`0,${-netForce * 500 - 8} -5,${-netForce * 500 + 2} 5,${-netForce * 500 + 2}`}
                fill="#4ade80"
              />

              {/* Weight force arrow */}
              <line x1={20} y1={0} x2={20} y2={30} stroke="url(#cartWeightForce)" strokeWidth={4} strokeLinecap="round" />
              <polygon points="20,38 15,28 25,28" fill="#f59e0b" />
            </g>
          )}

          {/* Premium pressure indicators with glow */}
          {isSqueezing && (
            <g filter="url(#cartPressureGlow)">
              {/* Left pressure arrow */}
              <polygon
                points={`${bottleX - 25},${bottleY + bottleHeight / 2} ${bottleX - 5},${bottleY + bottleHeight / 2 - 12} ${bottleX - 5},${bottleY + bottleHeight / 2 + 12}`}
                fill="url(#cartPressureArrow)"
              />
              <polygon
                points={`${bottleX - 22},${bottleY + bottleHeight / 2} ${bottleX - 8},${bottleY + bottleHeight / 2 - 8} ${bottleX - 8},${bottleY + bottleHeight / 2 + 8}`}
                fill="#ec4899"
              />

              {/* Right pressure arrow */}
              <polygon
                points={`${bottleX + bottleWidth + 25},${bottleY + bottleHeight / 2} ${bottleX + bottleWidth + 5},${bottleY + bottleHeight / 2 - 12} ${bottleX + bottleWidth + 5},${bottleY + bottleHeight / 2 + 12}`}
                fill="url(#cartPressureArrow)"
              />
              <polygon
                points={`${bottleX + bottleWidth + 22},${bottleY + bottleHeight / 2} ${bottleX + bottleWidth + 8},${bottleY + bottleHeight / 2 - 8} ${bottleX + bottleWidth + 8},${bottleY + bottleHeight / 2 + 8}`}
                fill="#ec4899"
              />

              {/* Pressure indicator bar */}
              <rect
                x={simWidth / 2 - 40}
                y={bottleY - 25}
                width={80}
                height={8}
                rx={4}
                fill="#1e293b"
                stroke="#334155"
                strokeWidth={1}
              />
              <rect
                x={simWidth / 2 - 38}
                y={bottleY - 23}
                width={76 * (pressure - 1) * 2}
                height={4}
                rx={2}
                fill="url(#cartPressureArrow)"
              />
            </g>
          )}
        </svg>

        {/* Status label outside SVG */}
        <div className="text-center mt-2 mb-4">
          <span style={{ fontSize: typo.small, color: colors.textSecondary }}>
            {isSqueezing ? 'Squeezing! Pressure increased!' : 'Click and hold to squeeze bottle'}
          </span>
        </div>

        {/* Data panel */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div style={{ fontSize: typo.label, color: '#f472b6' }}>Pressure</div>
            <div style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary }}>{pressure.toFixed(2)} atm</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div style={{ fontSize: typo.label, color: '#22d3ee' }}>Bubble Size</div>
            <div style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary }}>{(bubbleSize * 100).toFixed(0)}%</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div style={{ fontSize: typo.label, color: netForce > 0 ? '#4ade80' : '#fbbf24' }}>Net Force</div>
            <div style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary }}>{netForce > 0 ? 'Rising' : 'Sinking'}</div>
          </div>
        </div>

        {/* Force legend outside SVG */}
        {showForces && (
          <div className="flex justify-center gap-6 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(to top, #22c55e, #4ade80)' }} />
              <span style={{ fontSize: typo.label, color: colors.textSecondary }}>Buoyancy (Fb)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(to bottom, #fbbf24, #f59e0b)' }} />
              <span style={{ fontSize: typo.label, color: colors.textSecondary }}>Weight (W)</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Twist play visualization - 3 divers
  const renderTwistSimulation = () => {
    const simWidth = isMobile ? 340 : 450;
    const simHeight = 420;
    const bottleWidth = 150;
    const bottleHeight = 340;
    const bottleX = (simWidth - bottleWidth) / 2;
    const bottleY = 40;

    const bubble1Size = calculateBubbleSize(twistPressure, 1.2);
    const bubble2Size = calculateBubbleSize(twistPressure, 1.0);
    const bubble3Size = calculateBubbleSize(twistPressure, 0.9);

    return (
      <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-4 border border-amber-700/30">
        <svg width={simWidth} height={simHeight} className="mx-auto">
          <defs>
            {/* Premium water depth gradient for twist */}
            <linearGradient id="cartTwistWaterDepth" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.7" />
              <stop offset="20%" stopColor="#0ea5e9" stopOpacity="0.75" />
              <stop offset="40%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#0369a1" stopOpacity="0.85" />
              <stop offset="80%" stopColor="#075985" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.95" />
            </linearGradient>

            {/* Premium glass bottle gradient for twist */}
            <linearGradient id="cartTwistBottleGlass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.25" />
              <stop offset="25%" stopColor="#fbbf24" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.05" />
              <stop offset="75%" stopColor="#fbbf24" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#fcd34d" stopOpacity="0.25" />
            </linearGradient>

            {/* Diver 1 cap - Green */}
            <radialGradient id="cartDiver1Cap" cx="40%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </radialGradient>

            {/* Diver 2 cap - Blue */}
            <radialGradient id="cartDiver2Cap" cx="40%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </radialGradient>

            {/* Diver 3 cap - Red */}
            <radialGradient id="cartDiver3Cap" cx="40%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </radialGradient>

            {/* Twist tube glass gradient */}
            <linearGradient id="cartTwistTubeGlass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d1d5db" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#f3f4f6" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#f3f4f6" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#9ca3af" stopOpacity="0.9" />
            </linearGradient>

            {/* Air bubble gradient for twist */}
            <radialGradient id="cartTwistAirBubble" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#e0f2fe" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#bae6fd" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.5" />
            </radialGradient>

            {/* Twist pressure glow filter */}
            <filter id="cartTwistPressureGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Twist diver glow filter */}
            <filter id="cartTwistDiverGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Twist bubble glow */}
            <filter id="cartTwistBubbleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glass highlight for twist */}
            <linearGradient id="cartTwistGlassHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Bottle with amber-tinted glass effect */}
          <rect
            x={bottleX - (isTwistSqueezing ? 5 : 0)}
            y={bottleY}
            width={bottleWidth + (isTwistSqueezing ? 10 : 0)}
            height={bottleHeight}
            rx={20}
            fill="url(#cartTwistBottleGlass)"
            stroke="#fbbf24"
            strokeWidth={2}
            style={{ transition: 'all 0.1s ease' }}
          />

          {/* Glass highlight reflection */}
          <rect
            x={bottleX + 5 - (isTwistSqueezing ? 4 : 0)}
            y={bottleY + 5}
            width={15}
            height={bottleHeight - 30}
            rx={8}
            fill="url(#cartTwistGlassHighlight)"
            style={{ transition: 'all 0.1s ease' }}
          />

          {/* Water with depth gradient */}
          <rect
            x={bottleX + 5 - (isTwistSqueezing ? 4 : 0)}
            y={bottleY + 10}
            width={bottleWidth - 10 + (isTwistSqueezing ? 8 : 0)}
            height={bottleHeight - 20}
            rx={15}
            fill="url(#cartTwistWaterDepth)"
            style={{ transition: 'all 0.1s ease' }}
          />

          {/* Water surface highlight */}
          <ellipse
            cx={simWidth / 2}
            cy={bottleY + 18}
            rx={(bottleWidth - 20 + (isTwistSqueezing ? 8 : 0)) / 2}
            ry={4}
            fill="#38bdf8"
            opacity={0.4}
            style={{ transition: 'all 0.1s ease' }}
          />

          {/* Diver 1 - Large bubble (green) */}
          <g transform={`translate(${bottleX + 35}, ${bottleY + 30 + diver1Pos * (bottleHeight - 80)})`} filter="url(#cartTwistDiverGlow)">
            <rect x={-6} y={-20} width={12} height={40} rx={3} fill="url(#cartTwistTubeGlass)" stroke="#22c55e" strokeWidth={2} />
            <rect x={-4} y={-18} width={3} height={36} rx={1.5} fill="white" opacity={0.3} />
            <ellipse cx={0} cy={-25} rx={8} ry={6} fill="url(#cartDiver1Cap)" />
            <ellipse cx={-2} cy={-27} rx={2} ry={1.5} fill="white" opacity={0.4} />
            <ellipse cx={0} cy={-2} rx={4 + bubble1Size * 6} ry={6 + bubble1Size * 8} fill="url(#cartTwistAirBubble)" filter="url(#cartTwistBubbleGlow)" />
            <ellipse cx={-1 - bubble1Size * 2} cy={-2 - bubble1Size * 3} rx={bubble1Size * 1.5} ry={bubble1Size * 2} fill="white" opacity={0.5} />
          </g>

          {/* Diver 2 - Medium bubble (blue) */}
          <g transform={`translate(${bottleX + 75}, ${bottleY + 30 + diver2Pos * (bottleHeight - 80)})`} filter="url(#cartTwistDiverGlow)">
            <rect x={-6} y={-20} width={12} height={40} rx={3} fill="url(#cartTwistTubeGlass)" stroke="#3b82f6" strokeWidth={2} />
            <rect x={-4} y={-18} width={3} height={36} rx={1.5} fill="white" opacity={0.3} />
            <ellipse cx={0} cy={-25} rx={8} ry={6} fill="url(#cartDiver2Cap)" />
            <ellipse cx={-2} cy={-27} rx={2} ry={1.5} fill="white" opacity={0.4} />
            <ellipse cx={0} cy={-2} rx={4 + bubble2Size * 6} ry={6 + bubble2Size * 8} fill="url(#cartTwistAirBubble)" filter="url(#cartTwistBubbleGlow)" />
            <ellipse cx={-1 - bubble2Size * 2} cy={-2 - bubble2Size * 3} rx={bubble2Size * 1.5} ry={bubble2Size * 2} fill="white" opacity={0.5} />
          </g>

          {/* Diver 3 - Small bubble (red) */}
          <g transform={`translate(${bottleX + 115}, ${bottleY + 30 + diver3Pos * (bottleHeight - 80)})`} filter="url(#cartTwistDiverGlow)">
            <rect x={-6} y={-20} width={12} height={40} rx={3} fill="url(#cartTwistTubeGlass)" stroke="#ef4444" strokeWidth={2} />
            <rect x={-4} y={-18} width={3} height={36} rx={1.5} fill="white" opacity={0.3} />
            <ellipse cx={0} cy={-25} rx={8} ry={6} fill="url(#cartDiver3Cap)" />
            <ellipse cx={-2} cy={-27} rx={2} ry={1.5} fill="white" opacity={0.4} />
            <ellipse cx={0} cy={-2} rx={4 + bubble3Size * 6} ry={6 + bubble3Size * 8} fill="url(#cartTwistAirBubble)" filter="url(#cartTwistBubbleGlow)" />
            <ellipse cx={-1 - bubble3Size * 2} cy={-2 - bubble3Size * 3} rx={bubble3Size * 1.5} ry={bubble3Size * 2} fill="white" opacity={0.5} />
          </g>

          {/* Premium pressure arrows with glow */}
          {isTwistSqueezing && (
            <g filter="url(#cartTwistPressureGlow)">
              {/* Left pressure arrow */}
              <polygon
                points={`${bottleX - 25},${bottleY + bottleHeight / 2} ${bottleX - 5},${bottleY + bottleHeight / 2 - 12} ${bottleX - 5},${bottleY + bottleHeight / 2 + 12}`}
                fill="#f472b6"
                opacity={0.5}
              />
              <polygon
                points={`${bottleX - 22},${bottleY + bottleHeight / 2} ${bottleX - 8},${bottleY + bottleHeight / 2 - 8} ${bottleX - 8},${bottleY + bottleHeight / 2 + 8}`}
                fill="#ec4899"
              />

              {/* Right pressure arrow */}
              <polygon
                points={`${bottleX + bottleWidth + 25},${bottleY + bottleHeight / 2} ${bottleX + bottleWidth + 5},${bottleY + bottleHeight / 2 - 12} ${bottleX + bottleWidth + 5},${bottleY + bottleHeight / 2 + 12}`}
                fill="#f472b6"
                opacity={0.5}
              />
              <polygon
                points={`${bottleX + bottleWidth + 22},${bottleY + bottleHeight / 2} ${bottleX + bottleWidth + 8},${bottleY + bottleHeight / 2 - 8} ${bottleX + bottleWidth + 8},${bottleY + bottleHeight / 2 + 8}`}
                fill="#ec4899"
              />

              {/* Pressure indicator bar */}
              <rect
                x={simWidth / 2 - 50}
                y={bottleY - 25}
                width={100}
                height={8}
                rx={4}
                fill="#1e293b"
                stroke="#334155"
                strokeWidth={1}
              />
              <rect
                x={simWidth / 2 - 48}
                y={bottleY - 23}
                width={96 * (twistPressure - 1) * 3.3}
                height={4}
                rx={2}
                fill="#ec4899"
              />
            </g>
          )}
        </svg>

        {/* Status label outside SVG */}
        <div className="text-center mt-2 mb-3">
          <span style={{ fontSize: typo.small, color: colors.textSecondary }}>
            {isTwistSqueezing ? 'Watch which diver sinks first!' : 'Squeeze gently to compare'}
          </span>
        </div>

        {/* Diver labels outside SVG */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div style={{ fontSize: typo.label, color: '#22c55e', fontWeight: 600 }}>Large Bubble</div>
          <div style={{ fontSize: typo.label, color: '#3b82f6', fontWeight: 600 }}>Medium Bubble</div>
          <div style={{ fontSize: typo.label, color: '#ef4444', fontWeight: 600 }}>Small Bubble</div>
        </div>

        {/* Data panel */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-emerald-900/30 rounded-lg p-2 border border-emerald-700/30">
            <div style={{ fontSize: typo.label, color: '#4ade80' }}>Bubble Size</div>
            <div style={{ fontSize: typo.body, fontWeight: 700, color: colors.textPrimary }}>{(bubble1Size * 100).toFixed(0)}%</div>
          </div>
          <div className="bg-blue-900/30 rounded-lg p-2 border border-blue-700/30">
            <div style={{ fontSize: typo.label, color: '#60a5fa' }}>Bubble Size</div>
            <div style={{ fontSize: typo.body, fontWeight: 700, color: colors.textPrimary }}>{(bubble2Size * 100).toFixed(0)}%</div>
          </div>
          <div className="bg-red-900/30 rounded-lg p-2 border border-red-700/30">
            <div style={{ fontSize: typo.label, color: '#f87171' }}>Bubble Size</div>
            <div style={{ fontSize: typo.body, fontWeight: 700, color: colors.textPrimary }}>{(bubble3Size * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        The Cartesian Diver
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        A simple squeeze makes things sink. Release, and they rise.
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 rounded-3xl" />
        <div className="relative">
          <div className="text-7xl mb-6">🧪</div>
          <div className="mt-8 space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Named after Rene Descartes, this 17th-century toy reveals the same physics that lets submarines dive and fish hover effortlessly.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              Inside a sealed bottle: water, a dropper with trapped air, and the secret of buoyancy control.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('predict')}
        style={{ zIndex: 10 }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover the Secret
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2"><span className="text-cyan-400">*</span>Interactive Lab</div>
        <div className="flex items-center gap-2"><span className="text-cyan-400">*</span>Real-World Examples</div>
        <div className="flex items-center gap-2"><span className="text-cyan-400">*</span>Knowledge Test</div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6 border border-slate-700/50">
        <p className="text-lg text-slate-300 mb-4">{predictions.initial.question}</p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {predictions.initial.options.map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            style={{ zIndex: 10 }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.correct ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.correct ? 'bg-emerald-600/40 border-2 border-emerald-400'
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
          <p className="text-emerald-400 font-semibold mb-2">
            {selectedPrediction === 'C' ? 'Correct!' : 'Not quite!'}
          </p>
          <p className="text-slate-300 text-sm">{predictions.initial.explanation}</p>
          <button
            onClick={() => goToPhase('play')}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl"
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Diver Lab</h2>
      <p className="text-slate-400 mb-6 text-center max-w-lg">Press and hold to squeeze the bottle. Watch the air bubble and diver respond!</p>

      {renderDiverSimulation()}

      <div className="flex gap-3 justify-center my-6">
        <button
          onMouseDown={handleSqueezeStart}
          onMouseUp={handleSqueezeEnd}
          onMouseLeave={handleSqueezeEnd}
          onTouchStart={handleSqueezeStart}
          onTouchEnd={handleSqueezeEnd}
          style={{ zIndex: 10 }}
          className={`px-8 py-4 rounded-xl font-bold text-white transition-all ${
            isSqueezing
              ? 'bg-gradient-to-r from-pink-500 to-amber-500 scale-95'
              : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-lg'
          }`}
        >
          {isSqueezing ? 'Squeezing!' : 'Hold to Squeeze'}
        </button>
        <button
          onClick={() => setShowForces(!showForces)}
          style={{ zIndex: 10 }}
          className={`px-4 py-4 rounded-xl font-medium ${showForces ? 'bg-blue-600' : 'bg-slate-700'} text-white`}
        >
          Forces {showForces ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 max-w-lg border border-slate-700/50">
        <h3 className="text-cyan-400 font-semibold mb-2">Boyle's Law: PV = constant</h3>
        <p className="text-slate-300 text-sm">When pressure increases, the air bubble compresses. Less displaced water means less buoyancy!</p>
      </div>

      <button
        onClick={() => goToPhase('review')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl"
      >
        Review the Concepts
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">How Pressure Affects Buoyancy</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6 border border-cyan-700/30">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">Boyle's Law</h3>
          <div className="bg-slate-900/50 rounded-lg p-3 mb-3 text-center">
            <span className="text-xl font-mono text-cyan-300">P1 x V1 = P2 x V2</span>
          </div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>* Pressure up = Volume down</li>
            <li>* Compressed bubble = less volume</li>
            <li>* Works at constant temperature</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 border border-emerald-700/30">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Archimedes' Principle</h3>
          <div className="bg-slate-900/50 rounded-lg p-3 mb-3 text-center">
            <span className="text-xl font-mono text-emerald-300">F_buoyancy = rho x g x V</span>
          </div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>* Buoyancy = weight of displaced fluid</li>
            <li>* Less volume = less buoyant force</li>
            <li>* Object sinks when weight exceeds buoyancy</li>
          </ul>
        </div>
      </div>

      <div className="bg-gradient-to-r from-pink-900/30 to-purple-900/30 rounded-2xl p-6 max-w-4xl mt-6 border border-pink-700/30">
        <h3 className="text-xl font-bold text-pink-400 mb-3">The Cartesian Diver Connection</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-pink-400 font-semibold mb-1">1. Squeeze Bottle</div>
            <p className="text-slate-300">Pressure increases throughout the water</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-pink-400 font-semibold mb-1">2. Air Compresses</div>
            <p className="text-slate-300">The bubble shrinks (Boyle's Law)</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-pink-400 font-semibold mb-1">3. Diver Sinks</div>
            <p className="text-slate-300">Less buoyancy than weight (Archimedes)</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{ zIndex: 10 }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
      >
        Discover a Surprising Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6 border border-amber-700/30">
        <p className="text-lg text-slate-300 mb-4">{predictions.twist.question}</p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {predictions.twist.options.map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            style={{ zIndex: 10 }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.correct ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.correct ? 'bg-emerald-600/40 border-2 border-emerald-400'
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
          <p className="text-emerald-400 font-semibold mb-2">{twistPrediction === 'C' ? 'Excellent!' : 'Interesting guess!'}</p>
          <p className="text-slate-300 text-sm">{predictions.twist.explanation}</p>
          <button
            onClick={() => goToPhase('twist_play')}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
          >
            Test with Multiple Divers
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Compare Different Divers</h2>
      <p className="text-slate-400 mb-6 text-center">Three divers with different bubble sizes. Watch which sinks first!</p>

      {renderTwistSimulation()}

      <div className="flex gap-3 justify-center my-6">
        <button
          onMouseDown={handleTwistSqueezeStart}
          onMouseUp={handleTwistSqueezeEnd}
          onMouseLeave={handleTwistSqueezeEnd}
          onTouchStart={handleTwistSqueezeStart}
          onTouchEnd={handleTwistSqueezeEnd}
          style={{ zIndex: 10 }}
          className={`px-8 py-4 rounded-xl font-bold text-white transition-all ${
            isTwistSqueezing
              ? 'bg-gradient-to-r from-pink-500 to-amber-500 scale-95'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-lg'
          }`}
        >
          {isTwistSqueezing ? 'Squeezing!' : 'Hold to Squeeze Gently'}
        </button>
        <button
          onClick={() => {
            setDiver1Pos(0.25);
            setDiver2Pos(0.3);
            setDiver3Pos(0.35);
            setTwistPressure(1.0);
          }}
          style={{ zIndex: 10 }}
          className="px-4 py-4 rounded-xl font-medium bg-slate-700 text-white"
        >
          Reset
        </button>
      </div>

      <div className="bg-amber-900/30 rounded-xl p-4 max-w-lg border border-amber-700/30">
        <h3 className="text-amber-400 font-semibold mb-2">Key Insight</h3>
        <p className="text-slate-300 text-sm">The diver with the smallest air bubble has the least buoyancy margin. When pressure increases, it loses its ability to float first!</p>
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
      >
        Review the Discovery
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Air Volume and Sinking Depth</h2>
      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl mb-6 border border-amber-700/30">
        <h3 className="text-xl font-bold text-amber-400 mb-4">The Trapped Air Relationship</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-3 border border-emerald-700/30">
            <div className="text-emerald-400 font-semibold mb-2">Large Bubble</div>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>* More buoyancy reserve</li>
              <li>* Needs more pressure to sink</li>
              <li>* Sinks last</li>
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 border border-blue-700/30">
            <div className="text-blue-400 font-semibold mb-2">Medium Bubble</div>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>* Moderate reserve</li>
              <li>* Moderate pressure needed</li>
              <li>* Sinks second</li>
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 border border-red-700/30">
            <div className="text-red-400 font-semibold mb-2">Small Bubble</div>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>* Minimal reserve</li>
              <li>* Little pressure needed</li>
              <li>* Sinks first</li>
            </ul>
          </div>
        </div>
        <p className="text-emerald-400 font-medium mt-4">Real submarines and fish must maintain enough air volume for emergency buoyancy!</p>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 max-w-2xl border border-slate-700/50">
        <h3 className="text-cyan-400 font-semibold mb-2">Why This Matters</h3>
        <p className="text-slate-300 text-sm mb-2">Submarines carry compressed air for emergencies. If they descend too deep and lose too much air, they may not have enough reserve buoyancy to surface!</p>
        <p className="text-slate-300 text-sm">Fish with damaged swim bladders face the same challenge - they constantly struggle to maintain their depth.</p>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl"
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {realWorldApplications.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveAppTab(index)}
            style={{ zIndex: 10 }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index ? 'bg-cyan-600 text-white'
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
          <span className="text-cyan-400 text-sm font-mono">{realWorldApplications[activeAppTab].formula}</span>
        </div>
        <div className="bg-emerald-900/30 rounded-lg p-3 border border-emerald-700/30">
          <p className="text-emerald-400 text-sm">{realWorldApplications[activeAppTab].realExample}</p>
        </div>
        {!completedApps.has(activeAppTab) && (
          <button
            onClick={() => handleAppComplete(activeAppTab)}
            style={{ zIndex: 10 }}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium"
          >
            Mark as Understood
          </button>
        )}
      </div>
      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">{realWorldApplications.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />))}</div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>
      {completedApps.size >= 4 && (
        <button
          onClick={() => goToPhase('test')}
          style={{ zIndex: 10 }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl"
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
                    className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-cyan-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={() => { setShowTestResults(true); playSound('complete'); emit('test_completed', { score: calculateScore() }); }}
            style={{ zIndex: 10 }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(-1) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'}`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center border border-slate-700/50">
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🏆' : '📚'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/10</h3>
          <p className="text-slate-300 mb-6">{calculateScore() >= 7 ? "Excellent! You've mastered buoyancy physics!" : 'Keep studying! Review and try again.'}</p>
          {calculateScore() >= 7 ? (
            <button
              onClick={() => { goToPhase('mastery'); emit('mastery_achieved', { score: calculateScore() }); }}
              style={{ zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onClick={() => { setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase('review'); }}
              style={{ zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl"
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
      <div className="bg-gradient-to-br from-cyan-900/50 via-blue-900/50 to-teal-900/50 rounded-3xl p-8 max-w-2xl border border-cyan-700/30">
        <div className="text-8xl mb-6">🧪</div>
        <h1 className="text-3xl font-bold text-white mb-4">Buoyancy Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You've mastered the Cartesian Diver and buoyancy physics!</p>

        <div className="bg-slate-800/50 rounded-xl p-4 mb-6 text-left">
          <h3 className="text-cyan-400 font-semibold mb-3">You Now Understand:</h3>
          <ul className="text-slate-300 space-y-2">
            <li>* How pressure affects gas volume (Boyle's Law)</li>
            <li>* How displaced fluid creates buoyancy (Archimedes)</li>
            <li>* Why trapped air volume determines sinking behavior</li>
            <li>* Real-world applications in submarines, fish, and diving</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🚢</div><p className="text-sm text-slate-300">Submarines</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🐟</div><p className="text-sm text-slate-300">Fish Bladders</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🤿</div><p className="text-sm text-slate-300">Scuba Diving</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🎈</div><p className="text-sm text-slate-300">Hot Air Balloons</p></div>
        </div>

        <button
          onClick={() => goToPhase('hook')}
          style={{ zIndex: 10 }}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl"
        >
          Explore Again
        </button>
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

  const phaseIndex = phaseOrder.indexOf(phase);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Cartesian Diver</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                    : phaseIndex > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={p.replace('_', ' ')}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phase.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default CartesianDiverRenderer;
