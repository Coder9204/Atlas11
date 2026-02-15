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
    description: 'Submarines use the same principle as Cartesian divers! They have ballast tanks that can be filled with water (to sink) or compressed air (to rise). By precisely controlling the air/water ratio, submarines can hover at any depth. Modern nuclear submarines can operate at depths of 300m or more.',
    formula: 'Buoyancy = rho_water x V_displaced x g = Weight for neutral buoyancy',
    realExample: 'A nuclear submarine weighing 6,000 tons can hover motionless at 300m depth by precisely balancing its ballast tanks. Even a 1% change in buoyancy (60 tons) can cause unwanted depth changes of 50m or more.',
  },
  {
    id: 'fish',
    title: 'Fish Swim Bladders',
    icon: '🐟',
    subtitle: "Nature's buoyancy control",
    description: 'Most bony fish (over 90% of species) have a swim bladder - an internal gas-filled organ they can inflate or deflate. By adjusting the gas volume, fish control their buoyancy without constantly swimming, saving up to 60% of their energy compared to fish without swim bladders.',
    formula: 'Fish adjusts V_bladder to match: rho_fish x V_fish = rho_water x V_fish',
    realExample: 'Goldfish can hover motionless by fine-tuning their swim bladder. Deep-sea fish at 1000m depth must be brought up slowly over 24 hours or their swim bladder expands 100x and ruptures!',
  },
  {
    id: 'scuba',
    title: 'Scuba BCDs',
    icon: '🤿',
    subtitle: 'BCD and pressure at depth',
    description: 'Scuba divers wear a BCD (Buoyancy Control Device) - an inflatable vest with 15-20 liters capacity. As divers descend, increasing water pressure (1 atm every 10m) compresses air in their BCD, requiring them to add more air to maintain neutral buoyancy.',
    formula: 'P1V1 = P2V2 - At 10m depth, air volume halves!',
    realExample: 'At 30m depth (4 atm), a diver needs 4x as much air in their BCD as at the surface. A typical dive uses 200 bar of air over 45 minutes. This is why proper buoyancy control is a critical diving skill.',
  },
  {
    id: 'balloons',
    title: 'Hot Air Balloons',
    icon: '🎈',
    subtitle: 'Density and atmospheric buoyancy',
    description: 'Hot air balloons work on the same principle but in air instead of water. Heating the air inside to 100C makes it 25% less dense than surrounding cool air, creating buoyancy. The pilot controls altitude by adjusting the 3-4 million BTU burner.',
    formula: 'Lift = (rho_cold - rho_hot) x V_balloon x g',
    realExample: 'A typical hot air balloon holds 77,000 cubic feet (2,180 cubic meters) of air heated to 100C above ambient temperature, generating about 200 lbs (90 kg) of lift per 1000 cubic feet. Maximum altitude: 21,000 feet.',
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
  const [currentQuestion, setCurrentQuestion] = useState(0);

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

  // Slider state for play phase
  const [angle, setAngle] = useState(30);

  const lastClickRef = useRef(0);
  const animationRef = useRef<number>();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Premium Design System - with high contrast colors
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
    textSecondary: '#e2e8f0', // slate-200 - HIGH CONTRAST (brightness ~220)
    textMuted: '#cbd5e1',     // slate-300 - readable muted (brightness ~200)
    border: '#334155',        // slate-700
    borderLight: '#475569',   // slate-600
    // Theme-specific
    water: '#3b82f6',         // blue-500
    diver: '#f97316',         // orange-500
    pressureColor: '#ef4444', // red-500
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

  const phaseIndex = phaseOrder.indexOf(phase);

  // Common button style with minimum 44px height for touch targets
  const buttonBaseStyle: React.CSSProperties = {
    minHeight: '44px',
    padding: '12px 24px',
    borderRadius: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
    color: '#ffffff',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: colors.bgCardLight,
    color: colors.textPrimary,
    border: `1px solid ${colors.border}`,
  };

  // ============================================================================
  // NAVIGATION DOTS - Fixed at top with z-index
  // ============================================================================

  const renderNavDots = () => (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${colors.border}`,
        padding: '12px 24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '800px', margin: '0 auto' }}>
        <span style={{ fontSize: typo.small, fontWeight: 600, color: colors.textPrimary }}>Cartesian Diver</span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              aria-label={`${p.replace('_', ' ')} phase`}
              title={p.replace('_', ' ')}
              style={{
                width: phase === p ? '24px' : '8px',
                height: '8px',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                background: phase === p
                  ? colors.accent
                  : phaseIndex > i
                    ? colors.success
                    : colors.border,
                transition: 'all 0.3s ease',
                boxShadow: phase === p ? `0 0 8px ${colors.accent}` : 'none',
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: typo.small, color: colors.accent }}>{phase.replace('_', ' ')}</span>
      </div>
    </nav>
  );

  // ============================================================================
  // FIXED BOTTOM NAVIGATION BAR
  // ============================================================================

  const renderBottomNav = (backAction?: () => void, nextAction?: () => void, nextLabel?: string) => (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.98)',
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${colors.border}`,
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
        padding: '16px 24px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '800px', margin: '0 auto', gap: '12px' }}>
        {backAction ? (
          <button onClick={backAction} style={{ ...secondaryButtonStyle, minHeight: '48px' }}>
            ← Back
          </button>
        ) : (
          <div />
        )}
        {nextAction && (
          <button onClick={nextAction} style={{ ...primaryButtonStyle, minHeight: '48px' }}>
            {nextLabel || 'Next →'}
          </button>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // STATIC DIVER VISUALIZATION (for predict phase - no animation)
  // ============================================================================

  const renderStaticDiverVisualization = () => {
    const simWidth = 350;
    const simHeight = 300;
    const bottleWidth = 100;
    const bottleHeight = 240;
    const bottleX = (simWidth - bottleWidth) / 2;
    const bottleY = 30;
    const diverY = bottleY + 80;
    const diverX = simWidth / 2;

    return (
      <svg
        width="100%"
        height="auto"
        viewBox={`0 0 ${simWidth} ${simHeight}`}
        style={{ display: 'block', margin: '0 auto', maxWidth: `${simWidth}px` }}
      >
        <defs>
          <linearGradient id="staticWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="staticBottleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#a5f3fc" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="staticBubbleGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.5" />
          </radialGradient>
        </defs>

        {/* Bottle outline */}
        <rect x={bottleX} y={bottleY} width={bottleWidth} height={bottleHeight} rx={15} fill="url(#staticBottleGrad)" stroke="#67e8f9" strokeWidth={2} />

        {/* Water */}
        <rect x={bottleX + 5} y={bottleY + 10} width={bottleWidth - 10} height={bottleHeight - 20} rx={10} fill="url(#staticWaterGrad)" />

        {/* Diver */}
        <g transform={`translate(${diverX}, ${diverY})`}>
          <rect x={-6} y={-20} width={12} height={40} rx={3} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1} />
          <ellipse cx={0} cy={-25} rx={8} ry={6} fill="#ef4444" />
          <ellipse cx={0} cy={-5} rx={5} ry={10} fill="url(#staticBubbleGrad)" />
        </g>

        {/* Labels */}
        <text x={bottleX - 30} y={bottleY + 50} textAnchor="end" fill="#e2e8f0" fontSize="12">Bottle</text>
        <text x={bottleX + bottleWidth + 10} y={bottleY + 100} textAnchor="start" fill="#38bdf8" fontSize="12">Water</text>
        <text x={diverX + 30} y={diverY} textAnchor="start" fill="#f87171" fontSize="12">Diver</text>
        <text x={diverX + 30} y={diverY + 15} textAnchor="start" fill="#7dd3fc" fontSize="11">Air Bubble</text>
        <text x={simWidth / 2} y={simHeight - 10} textAnchor="middle" fill="#e2e8f0" fontSize="12">
          Sealed bottle with water and dropper
        </text>
      </svg>
    );
  };

  // ============================================================================
  // DIVER SIMULATION VISUALIZATION (for play phase - with animation)
  // ============================================================================

  const renderDiverSimulation = () => {
    const simWidth = 400;
    const simHeight = 400;
    const bottleWidth = 120;
    const bottleHeight = 320;
    const bottleX = (simWidth - bottleWidth) / 2;
    const bottleY = 40;

    const diverY = bottleY + 30 + diverPosition * (bottleHeight - 80);
    const diverX = simWidth / 2;
    const bubbleRadius = 8 + bubbleSize * 12;

    return (
      <div style={{ background: 'linear-gradient(to bottom, rgba(30,41,59,0.5), rgba(15,23,42,0.5))', borderRadius: '16px', padding: '16px', border: `1px solid ${colors.border}`, maxWidth: '450px', margin: '0 auto' }}>
        <svg width="100%" height="auto" viewBox={`0 0 ${simWidth} ${simHeight}`} style={{ display: 'block', margin: '0 auto', maxWidth: `${simWidth}px` }}>
          <defs>
            <linearGradient id="cartWaterDepth" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="cartBottleGlass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#a5f3fc" stopOpacity="0.4" />
            </linearGradient>
            <radialGradient id="cartAirBubble" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.5" />
            </radialGradient>
            <radialGradient id="cartDiverCap" cx="40%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#dc2626" />
            </radialGradient>
            <filter id="cartGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="cartShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3" />
            </filter>
            <filter id="cartWaterRipple" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
            </filter>
          </defs>

          {/* Bottle */}
          <rect
            x={bottleX - (isSqueezing ? 5 : 0)}
            y={bottleY}
            width={bottleWidth + (isSqueezing ? 10 : 0)}
            height={bottleHeight}
            rx={20}
            fill="url(#cartBottleGlass)"
            stroke="#67e8f9"
            strokeWidth={2}
            filter="url(#cartShadow)"
            style={{ transition: 'all 0.1s ease' }}
          />

          {/* Water */}
          <rect
            x={bottleX + 5 - (isSqueezing ? 4 : 0)}
            y={bottleY + 10}
            width={bottleWidth - 10 + (isSqueezing ? 8 : 0)}
            height={bottleHeight - 20}
            rx={15}
            fill="url(#cartWaterDepth)"
            filter="url(#cartWaterRipple)"
            style={{ transition: 'all 0.1s ease' }}
          />

          {/* Animated bubbles */}
          {[...Array(6)].map((_, i) => {
            const bubbleYPos = ((animationTime * 30 + i * 45) % (bottleHeight - 40)) + bottleY + 20;
            const bubbleXPos = bottleX + 20 + (i % 3) * 35 + Math.sin(animationTime * 2 + i) * 5;
            return (
              <circle
                key={i}
                cx={bubbleXPos}
                cy={bottleY + bottleHeight - (bubbleYPos - bottleY)}
                r={2 + (i % 3)}
                fill="url(#cartAirBubble)"
                opacity={0.5}
              />
            );
          })}

          {/* Depth scale markers */}
          <g>
            <line x1={bottleX - 15} y1={bottleY + 30} x2={bottleX - 15} y2={bottleY + bottleHeight - 20} stroke="#475569" strokeWidth={1} />
            <line x1={bottleX - 20} y1={bottleY + 30} x2={bottleX - 10} y2={bottleY + 30} stroke="#475569" strokeWidth={1} />
            <text x={bottleX - 25} y={bottleY + 35} textAnchor="end" fill="#94a3b8" fontSize="11">0m</text>
            <line x1={bottleX - 20} y1={bottleY + bottleHeight / 2} x2={bottleX - 10} y2={bottleY + bottleHeight / 2} stroke="#475569" strokeWidth={1} />
            <text x={bottleX - 25} y={bottleY + bottleHeight / 2 + 3} textAnchor="end" fill="#94a3b8" fontSize="11">5m</text>
            <line x1={bottleX - 20} y1={bottleY + bottleHeight - 20} x2={bottleX - 10} y2={bottleY + bottleHeight - 20} stroke="#475569" strokeWidth={1} />
            <text x={bottleX - 25} y={bottleY + bottleHeight - 17} textAnchor="end" fill="#94a3b8" fontSize="11">10m</text>
          </g>

          {/* Diver */}
          <g transform={`translate(${diverX}, ${diverY})`} filter="url(#cartShadow)">
            <rect x={-8} y={-25} width={16} height={50} rx={4} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1} />
            <ellipse cx={0} cy={-30} rx={10} ry={8} fill="url(#cartDiverCap)" />
            <ellipse cx={0} cy={-5} rx={bubbleRadius * 0.5} ry={bubbleRadius} fill="url(#cartAirBubble)" filter="url(#cartGlow)" />
            <rect x={-3} y={25} width={6} height={8} rx={1} fill="#4b5563" />
          </g>

          {/* Force arrows */}
          {showForces && (
            <g transform={`translate(${diverX + 40}, ${diverY})`}>
              <line x1={0} y1={0} x2={0} y2={-netForce * 500} stroke="#4ade80" strokeWidth={4} strokeLinecap="round" />
              <polygon points={`0,${-netForce * 500 - 8} -5,${-netForce * 500 + 2} 5,${-netForce * 500 + 2}`} fill="#4ade80" />
              <line x1={20} y1={0} x2={20} y2={30} stroke="#fbbf24" strokeWidth={4} strokeLinecap="round" />
              <polygon points="20,38 15,28 25,28" fill="#f59e0b" />
            </g>
          )}

          {/* Pressure indicators */}
          {isSqueezing && (
            <g>
              <polygon
                points={`${bottleX - 20},${bottleY + bottleHeight / 2} ${bottleX - 5},${bottleY + bottleHeight / 2 - 10} ${bottleX - 5},${bottleY + bottleHeight / 2 + 10}`}
                fill="#ec4899"
                filter="url(#cartGlow)"
              />
              <polygon
                points={`${bottleX + bottleWidth + 20},${bottleY + bottleHeight / 2} ${bottleX + bottleWidth + 5},${bottleY + bottleHeight / 2 - 10} ${bottleX + bottleWidth + 5},${bottleY + bottleHeight / 2 + 10}`}
                fill="#ec4899"
                filter="url(#cartGlow)"
              />
            </g>
          )}

          {/* Educational labels */}
          <text x={bottleX - 10} y={bottleY + 20} textAnchor="end" fill="#e2e8f0" fontSize="11" fontWeight="500">Sealed Bottle</text>
          <text x={bottleX - 10} y={bottleY + 55} textAnchor="end" fill="#38bdf8" fontSize="11" fontWeight="500">Water</text>
          <text x={bottleX - 10} y={bottleY + 70} textAnchor="end" fill="#67e8f9" fontSize="11">High pressure</text>
          <text x={bottleX + bottleWidth + 10} y={bottleY + 60} textAnchor="start" fill="#f87171" fontSize="11" fontWeight="500">Cartesian Diver</text>
          <text x={bottleX + bottleWidth + 10} y={bottleY + 78} textAnchor="start" fill="#7dd3fc" fontSize="11">Air Bubble</text>
          <text x={bottleX + bottleWidth + 10} y={bottleY + 96} textAnchor="start" fill="#a5f3fc" fontSize="11">PV = constant</text>
          <text x={simWidth / 2} y={simHeight - 10} textAnchor="middle" fill="#e2e8f0" fontSize="11">
            Squeeze the bottle to increase pressure and observe buoyancy changes
          </text>
        </svg>

        {/* Status */}
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <span style={{ fontSize: typo.small, color: colors.textSecondary }}>
            {isSqueezing ? 'Squeezing! Pressure increased!' : 'Click and hold to squeeze bottle'}
          </span>
        </div>

        {/* Data panel */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
          <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: typo.label, color: '#f472b6' }}>Pressure</div>
            <div style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary }}>{pressure.toFixed(2)} atm</div>
          </div>
          <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: typo.label, color: '#22d3ee' }}>Bubble Size</div>
            <div style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary }}>{(bubbleSize * 100).toFixed(0)}%</div>
          </div>
          <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: typo.label, color: netForce > 0 ? '#4ade80' : '#fbbf24' }}>Net Force</div>
            <div style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary }}>{netForce > 0 ? 'Rising' : 'Sinking'}</div>
          </div>
        </div>

        {/* Force legend */}
        {showForces && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'linear-gradient(to top, #22c55e, #4ade80)' }} />
              <span style={{ fontSize: typo.label, color: colors.textSecondary }}>Buoyancy (Fb)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'linear-gradient(to bottom, #fbbf24, #f59e0b)' }} />
              <span style={{ fontSize: typo.label, color: colors.textSecondary }}>Weight (W)</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // TWIST SIMULATION VISUALIZATION
  // ============================================================================

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
      <div style={{ background: 'linear-gradient(to bottom, rgba(30,41,59,0.5), rgba(15,23,42,0.5))', borderRadius: '16px', padding: '16px', border: `1px solid rgba(217,119,6,0.3)` }}>
        <svg width="100%" height="auto" viewBox={`0 0 ${simWidth} ${simHeight}`} style={{ display: 'block', margin: '0 auto', maxWidth: `${simWidth}px` }}>
          <defs>
            <linearGradient id="cartTwistWater" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="cartTwistBottle" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#fcd34d" stopOpacity="0.25" />
            </linearGradient>
            <radialGradient id="cartTwistBubble" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.5" />
            </radialGradient>
          </defs>

          {/* Bottle */}
          <rect
            x={bottleX - (isTwistSqueezing ? 5 : 0)}
            y={bottleY}
            width={bottleWidth + (isTwistSqueezing ? 10 : 0)}
            height={bottleHeight}
            rx={20}
            fill="url(#cartTwistBottle)"
            stroke="#fbbf24"
            strokeWidth={2}
            style={{ transition: 'all 0.1s ease' }}
          />

          {/* Water */}
          <rect
            x={bottleX + 5 - (isTwistSqueezing ? 4 : 0)}
            y={bottleY + 10}
            width={bottleWidth - 10 + (isTwistSqueezing ? 8 : 0)}
            height={bottleHeight - 20}
            rx={15}
            fill="url(#cartTwistWater)"
            style={{ transition: 'all 0.1s ease' }}
          />

          {/* Diver 1 - Large bubble (green) */}
          <g transform={`translate(${bottleX + 35}, ${bottleY + 30 + diver1Pos * (bottleHeight - 80)})`}>
            <rect x={-6} y={-20} width={12} height={40} rx={3} fill="#e5e7eb" stroke="#22c55e" strokeWidth={2} />
            <ellipse cx={0} cy={-25} rx={8} ry={6} fill="#22c55e" />
            <ellipse cx={0} cy={-2} rx={4 + bubble1Size * 6} ry={6 + bubble1Size * 8} fill="url(#cartTwistBubble)" />
          </g>

          {/* Diver 2 - Medium bubble (blue) */}
          <g transform={`translate(${bottleX + 75}, ${bottleY + 30 + diver2Pos * (bottleHeight - 80)})`}>
            <rect x={-6} y={-20} width={12} height={40} rx={3} fill="#e5e7eb" stroke="#3b82f6" strokeWidth={2} />
            <ellipse cx={0} cy={-25} rx={8} ry={6} fill="#3b82f6" />
            <ellipse cx={0} cy={-2} rx={4 + bubble2Size * 6} ry={6 + bubble2Size * 8} fill="url(#cartTwistBubble)" />
          </g>

          {/* Diver 3 - Small bubble (red) */}
          <g transform={`translate(${bottleX + 115}, ${bottleY + 30 + diver3Pos * (bottleHeight - 80)})`}>
            <rect x={-6} y={-20} width={12} height={40} rx={3} fill="#e5e7eb" stroke="#ef4444" strokeWidth={2} />
            <ellipse cx={0} cy={-25} rx={8} ry={6} fill="#ef4444" />
            <ellipse cx={0} cy={-2} rx={4 + bubble3Size * 6} ry={6 + bubble3Size * 8} fill="url(#cartTwistBubble)" />
          </g>

          {/* Depth scale */}
          <line x1={bottleX - 15} y1={bottleY + 10} x2={bottleX - 15} y2={bottleY + bottleHeight - 10} stroke="#475569" strokeWidth={1} />
          <line x1={bottleX - 20} y1={bottleY + 10} x2={bottleX - 10} y2={bottleY + 10} stroke="#475569" strokeWidth={1} />
          <text x={bottleX - 25} y={bottleY + 15} textAnchor="end" fill="#94a3b8" fontSize="11">0m</text>
          <line x1={bottleX - 20} y1={bottleY + bottleHeight / 2} x2={bottleX - 10} y2={bottleY + bottleHeight / 2} stroke="#475569" strokeWidth={1} />
          <text x={bottleX - 25} y={bottleY + bottleHeight / 2 + 4} textAnchor="end" fill="#94a3b8" fontSize="11">5m</text>
          <line x1={bottleX - 20} y1={bottleY + bottleHeight - 10} x2={bottleX - 10} y2={bottleY + bottleHeight - 10} stroke="#475569" strokeWidth={1} />
          <text x={bottleX - 25} y={bottleY + bottleHeight - 6} textAnchor="end" fill="#94a3b8" fontSize="11">10m</text>

          {/* Diver labels */}
          <text x={bottleX + 35} y={bottleY + bottleHeight + 15} textAnchor="middle" fill="#22c55e" fontSize="11">Large</text>
          <text x={bottleX + 75} y={bottleY + bottleHeight + 15} textAnchor="middle" fill="#3b82f6" fontSize="11">Medium</text>
          <text x={bottleX + 115} y={bottleY + bottleHeight + 15} textAnchor="middle" fill="#ef4444" fontSize="11">Small</text>
          <text x={simWidth / 2} y={simHeight - 10} textAnchor="middle" fill="#e2e8f0" fontSize="11">Compare divers with different bubble sizes</text>

          {/* Pressure arrows */}
          {isTwistSqueezing && (
            <g>
              <polygon
                points={`${bottleX - 20},${bottleY + bottleHeight / 2} ${bottleX - 5},${bottleY + bottleHeight / 2 - 10} ${bottleX - 5},${bottleY + bottleHeight / 2 + 10}`}
                fill="#ec4899"
              />
              <polygon
                points={`${bottleX + bottleWidth + 20},${bottleY + bottleHeight / 2} ${bottleX + bottleWidth + 5},${bottleY + bottleHeight / 2 - 10} ${bottleX + bottleWidth + 5},${bottleY + bottleHeight / 2 + 10}`}
                fill="#ec4899"
              />
            </g>
          )}
        </svg>

        {/* Status */}
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <span style={{ fontSize: typo.small, color: colors.textSecondary }}>
            {isTwistSqueezing ? 'Watch which diver sinks first!' : 'Squeeze gently to compare'}
          </span>
        </div>

        {/* Diver labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: typo.label, color: '#22c55e', fontWeight: 600 }}>Large Bubble</div>
          <div style={{ fontSize: typo.label, color: '#3b82f6', fontWeight: 600 }}>Medium Bubble</div>
          <div style={{ fontSize: typo.label, color: '#ef4444', fontWeight: 600 }}>Small Bubble</div>
        </div>

        {/* Data panel */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px', textAlign: 'center' }}>
          <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: '8px', padding: '8px', border: '1px solid rgba(34,197,94,0.3)' }}>
            <div style={{ fontSize: typo.label, color: '#4ade80' }}>Bubble Size</div>
            <div style={{ fontSize: typo.body, fontWeight: 700, color: colors.textPrimary }}>{(bubble1Size * 100).toFixed(0)}%</div>
          </div>
          <div style={{ background: 'rgba(59,130,246,0.1)', borderRadius: '8px', padding: '8px', border: '1px solid rgba(59,130,246,0.3)' }}>
            <div style={{ fontSize: typo.label, color: '#60a5fa' }}>Bubble Size</div>
            <div style={{ fontSize: typo.body, fontWeight: 700, color: colors.textPrimary }}>{(bubble2Size * 100).toFixed(0)}%</div>
          </div>
          <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: '8px', padding: '8px', border: '1px solid rgba(239,68,68,0.3)' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.bgDark }}>
      {renderNavDots()}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px 120px', textAlign: 'center', overflowY: 'auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '999px', marginBottom: '32px' }}>
          <span style={{ width: '8px', height: '8px', background: colors.accent, borderRadius: '50%' }} />
          <span style={{ fontSize: typo.small, fontWeight: 500, color: colors.accent, letterSpacing: '0.05em' }}>PHYSICS EXPLORATION</span>
        </div>

        <h1 style={{ fontSize: typo.title, fontWeight: 700, marginBottom: '16px', background: 'linear-gradient(to right, #ffffff, #a5f3fc, #bfdbfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          The Cartesian Diver
        </h1>

        <p style={{ fontSize: typo.bodyLarge, color: colors.textSecondary, maxWidth: '400px', marginBottom: '40px' }}>
          A simple squeeze makes things sink. Release, and they rise.
        </p>

        <div style={{ position: 'relative', background: 'linear-gradient(to bottom right, rgba(30,41,59,0.8), rgba(15,23,42,0.8))', borderRadius: '24px', padding: '32px', maxWidth: '500px', width: '100%', border: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: '72px', marginBottom: '24px' }}>🧪</div>
          <p style={{ fontSize: typo.bodyLarge, color: colors.textPrimary, fontWeight: 500, lineHeight: 1.6, marginBottom: '16px' }}>
            Named after Rene Descartes, this 17th-century toy reveals the same physics that lets submarines dive and fish hover effortlessly.
          </p>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, lineHeight: 1.6 }}>
            Inside a sealed bottle: water, a dropper with trapped air, and the secret of buoyancy control.
          </p>
        </div>

        <div style={{ marginTop: '48px', display: 'flex', gap: '32px', fontSize: typo.small, color: colors.textMuted }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: colors.accent }}>*</span>Interactive Lab</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: colors.accent }}>*</span>Real-World Examples</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: colors.accent }}>*</span>Knowledge Test</div>
        </div>
      </div>
      {renderBottomNav(undefined, () => goToPhase('predict'), 'Start Exploring →')}
    </div>
  );

  const renderPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.bgDark }}>
      {renderNavDots()}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px 120px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Step 1 of 4</span>
        </div>
        <h2 style={{ fontSize: typo.heading, fontWeight: 700, color: colors.textPrimary, marginBottom: '24px' }}>Make Your Prediction</h2>

        {/* Static visualization */}
        <div style={{ marginBottom: '24px' }}>
          {renderStaticDiverVisualization()}
        </div>

        <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '16px', padding: '24px', maxWidth: '600px', marginBottom: '24px', border: `1px solid ${colors.border}` }}>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, lineHeight: 1.6 }}>{predictions.initial.question}</p>
        </div>

        <div style={{ display: 'grid', gap: '12px', width: '100%', maxWidth: '500px' }}>
          {predictions.initial.options.map(option => (
            <button
              key={option.id}
              onClick={() => handlePrediction(option.id)}
              disabled={showPredictionFeedback}
              style={{
                ...buttonBaseStyle,
                padding: '16px',
                textAlign: 'left',
                background: showPredictionFeedback && selectedPrediction === option.id
                  ? option.correct ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'
                  : showPredictionFeedback && option.correct ? 'rgba(16,185,129,0.3)'
                  : 'rgba(51,65,85,0.5)',
                border: showPredictionFeedback && selectedPrediction === option.id
                  ? option.correct ? '2px solid #10b981' : '2px solid #ef4444'
                  : showPredictionFeedback && option.correct ? '2px solid #10b981'
                  : '2px solid transparent',
                color: colors.textPrimary,
                opacity: showPredictionFeedback && !option.correct && selectedPrediction !== option.id ? 0.6 : 1,
              }}
            >
              <span style={{ fontWeight: 700 }}>{option.id}.</span>
              <span style={{ marginLeft: '8px', color: colors.textSecondary }}>{option.text}</span>
            </button>
          ))}
        </div>

        {showPredictionFeedback && (
          <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(30,41,59,0.7)', borderRadius: '12px', maxWidth: '500px', border: `1px solid ${colors.border}` }}>
            <p style={{ color: selectedPrediction === 'C' ? colors.success : colors.warning, fontWeight: 600, marginBottom: '8px' }}>
              {selectedPrediction === 'C' ? 'Correct!' : 'Not quite!'}
            </p>
            <p style={{ fontSize: typo.small, color: colors.textSecondary }}>{predictions.initial.explanation}</p>
          </div>
        )}
      </div>
      {renderBottomNav(
        () => goToPhase('hook'),
        showPredictionFeedback ? () => goToPhase('play') : undefined,
        'Explore the Physics →'
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.bgDark }}>
      {renderNavDots()}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px 120px', overflowY: 'auto' }}>
        <h2 style={{ fontSize: typo.heading, fontWeight: 700, color: colors.textPrimary, marginBottom: '8px' }}>Diver Lab</h2>
        <p style={{ fontSize: typo.body, color: colors.textSecondary, textAlign: 'center', maxWidth: '500px', marginBottom: '16px' }}>
          Observe how the diver responds when you increase the pressure. Watch the air bubble compress and notice the change in buoyancy force. This demonstrates Boyle's Law in action.
        </p>
        <p style={{ fontSize: typo.small, color: colors.accent, textAlign: 'center', maxWidth: '500px', marginBottom: '24px' }}>
          Real-world relevance: Submarines control depth using ballast tanks, fish use swim bladders, and scuba divers adjust their BCD - all using the same buoyancy principles you are exploring here!
        </p>

        {renderDiverSimulation()}

        {/* Controls section */}
        <div style={{ marginTop: '24px', width: '100%', maxWidth: '500px' }}>
          {/* Pressure slider */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Pressure Control - Adjust to see how volume changes</span>
              <span style={{ fontSize: typo.small, color: colors.accent, fontWeight: 600 }}>{angle}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={angle}
              onChange={(e) => {
                const newAngle = parseInt(e.target.value);
                setAngle(newAngle);
                // Connect slider to pressure simulation (0-100 maps to 1.0-1.5 atm)
                setPressure(1.0 + (newAngle / 200));
              }}
              style={{
                width: '100%',
                height: '20px',
                touchAction: 'pan-y',
                WebkitAppearance: 'none',
                accentColor: '#3b82f6',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onPointerDown={handleSqueezeStart}
              onPointerUp={handleSqueezeEnd}
              onPointerLeave={handleSqueezeEnd}
              onTouchStart={handleSqueezeStart}
              onTouchEnd={handleSqueezeEnd}
              style={{
                ...primaryButtonStyle,
                minHeight: '52px',
                background: isSqueezing
                  ? 'linear-gradient(135deg, #ec4899, #f59e0b)'
                  : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                transform: isSqueezing ? 'scale(0.95)' : 'scale(1)',
              }}
            >
              {isSqueezing ? 'Squeezing!' : 'Hold to Squeeze'}
            </button>
            <button
              onClick={() => setShowForces(!showForces)}
              style={{
                ...secondaryButtonStyle,
                minHeight: '52px',
                background: showForces ? colors.primary : colors.bgCardLight,
              }}
            >
              Forces {showForces ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div style={{ marginTop: '24px', background: 'rgba(30,41,59,0.5)', borderRadius: '12px', padding: '16px', maxWidth: '500px', border: `1px solid ${colors.border}` }}>
          <h3 style={{ color: colors.accent, fontWeight: 600, marginBottom: '8px' }}>Boyle's Law: PV = constant</h3>
          <p style={{ fontSize: typo.small, color: colors.textSecondary }}>When pressure increases, the air bubble compresses. Less displaced water means less buoyancy!</p>
        </div>
      </div>
      {renderBottomNav(() => goToPhase('predict'), () => goToPhase('review'), 'Review Concepts →')}
    </div>
  );

  const renderReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.bgDark }}>
      {renderNavDots()}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px 120px', overflowY: 'auto' }}>
        <h2 style={{ fontSize: typo.heading, fontWeight: 700, color: colors.textPrimary, marginBottom: '16px' }}>How Pressure Affects Buoyancy</h2>
        <p style={{ fontSize: typo.body, color: colors.textSecondary, textAlign: 'center', maxWidth: '500px', marginBottom: '24px' }}>
          As you predicted earlier, squeezing the bottle causes the diver to sink. Now let's understand the physics behind what you observed!
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px', maxWidth: '800px', width: '100%' }}>
          <div style={{ background: 'linear-gradient(to bottom right, rgba(6,182,212,0.2), rgba(59,130,246,0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(6,182,212,0.3)' }}>
            <h3 style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.accent, marginBottom: '12px' }}>Boyle's Law</h3>
            <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '12px', marginBottom: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: typo.bodyLarge, fontFamily: 'monospace', color: '#67e8f9' }}>P1 x V1 = P2 x V2</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ fontSize: typo.small, color: colors.textSecondary, marginBottom: '8px' }}>* Pressure up = Volume down</li>
              <li style={{ fontSize: typo.small, color: colors.textSecondary, marginBottom: '8px' }}>* Compressed bubble = less volume</li>
              <li style={{ fontSize: typo.small, color: colors.textSecondary }}>* Works at constant temperature</li>
            </ul>
          </div>

          <div style={{ background: 'linear-gradient(to bottom right, rgba(16,185,129,0.2), rgba(20,184,166,0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(16,185,129,0.3)' }}>
            <h3 style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.success, marginBottom: '12px' }}>Archimedes' Principle</h3>
            <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '12px', marginBottom: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: typo.bodyLarge, fontFamily: 'monospace', color: '#6ee7b7' }}>F_buoyancy = rho x g x V</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ fontSize: typo.small, color: colors.textSecondary, marginBottom: '8px' }}>* Buoyancy = weight of displaced fluid</li>
              <li style={{ fontSize: typo.small, color: colors.textSecondary, marginBottom: '8px' }}>* Less volume = less buoyant force</li>
              <li style={{ fontSize: typo.small, color: colors.textSecondary }}>* Object sinks when weight exceeds buoyancy</li>
            </ul>
          </div>
        </div>

        <div style={{ marginTop: '24px', background: 'linear-gradient(to right, rgba(236,72,153,0.1), rgba(168,85,247,0.1))', borderRadius: '16px', padding: '24px', maxWidth: '800px', width: '100%', border: '1px solid rgba(236,72,153,0.3)' }}>
          <h3 style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: '#f472b6', marginBottom: '16px' }}>The Cartesian Diver Connection</h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ color: '#f472b6', fontWeight: 600, marginBottom: '4px' }}>1. Squeeze Bottle</div>
              <p style={{ fontSize: typo.small, color: colors.textSecondary }}>Pressure increases throughout the water</p>
            </div>
            <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ color: '#f472b6', fontWeight: 600, marginBottom: '4px' }}>2. Air Compresses</div>
              <p style={{ fontSize: typo.small, color: colors.textSecondary }}>The bubble shrinks (Boyle's Law)</p>
            </div>
            <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ color: '#f472b6', fontWeight: 600, marginBottom: '4px' }}>3. Diver Sinks</div>
              <p style={{ fontSize: typo.small, color: colors.textSecondary }}>Less buoyancy than weight (Archimedes)</p>
            </div>
          </div>
        </div>
      </div>
      {renderBottomNav(() => goToPhase('play'), () => goToPhase('twist_predict'), 'Discover a Twist →')}
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.bgDark }}>
      {renderNavDots()}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px 120px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Step 2 of 4</span>
        </div>
        <h2 style={{ fontSize: typo.heading, fontWeight: 700, color: '#fbbf24', marginBottom: '24px' }}>The Twist Challenge</h2>

        {/* Static visualization of three divers */}
        <div style={{ marginBottom: '24px' }}>
          <svg width="100%" height="auto" viewBox="0 0 300 150" style={{ display: 'block', margin: '0 auto', maxWidth: '300px' }}>
            <defs>
              <linearGradient id="twistPredictWater" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            {/* Title */}
            <text x={150} y={14} textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="600">Bubble Size Comparison</text>
            {/* Bottle */}
            <rect x={75} y={20} width={150} height={110} rx={10} fill="url(#twistPredictWater)" stroke="#67e8f9" strokeWidth={2} />
            {/* Diver 1 - Large bubble (green) */}
            <g transform="translate(105, 60)">
              <rect x={-5} y={-15} width={10} height={30} rx={2} fill="#e5e7eb" stroke="#22c55e" strokeWidth={2} />
              <ellipse cx={0} cy={0} rx={6} ry={10} fill="#7dd3fc" opacity={0.8} />
            </g>
            <text x={105} y={108} textAnchor="middle" fill="#22c55e" fontSize="11">Large</text>
            {/* Diver 2 - Medium bubble (blue) */}
            <g transform="translate(150, 65)">
              <rect x={-5} y={-15} width={10} height={30} rx={2} fill="#e5e7eb" stroke="#3b82f6" strokeWidth={2} />
              <ellipse cx={0} cy={0} rx={4} ry={7} fill="#7dd3fc" opacity={0.8} />
            </g>
            <text x={150} y={113} textAnchor="middle" fill="#3b82f6" fontSize="11">Medium</text>
            {/* Diver 3 - Small bubble (red) */}
            <g transform="translate(195, 70)">
              <rect x={-5} y={-15} width={10} height={30} rx={2} fill="#e5e7eb" stroke="#ef4444" strokeWidth={2} />
              <ellipse cx={0} cy={0} rx={3} ry={5} fill="#7dd3fc" opacity={0.8} />
            </g>
            <text x={195} y={118} textAnchor="middle" fill="#ef4444" fontSize="11">Small</text>
            <text x={150} y={140} textAnchor="middle" fill="#e2e8f0" fontSize="11">Three divers with different bubble sizes</text>
          </svg>
        </div>

        <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '16px', padding: '24px', maxWidth: '600px', marginBottom: '24px', border: '1px solid rgba(217,119,6,0.3)' }}>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, lineHeight: 1.6 }}>{predictions.twist.question}</p>
        </div>

        <div style={{ display: 'grid', gap: '12px', width: '100%', maxWidth: '500px' }}>
          {predictions.twist.options.map(option => (
            <button
              key={option.id}
              onClick={() => handleTwistPrediction(option.id)}
              disabled={showTwistFeedback}
              style={{
                ...buttonBaseStyle,
                padding: '16px',
                textAlign: 'left',
                background: showTwistFeedback && twistPrediction === option.id
                  ? option.correct ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'
                  : showTwistFeedback && option.correct ? 'rgba(16,185,129,0.3)'
                  : 'rgba(51,65,85,0.5)',
                border: showTwistFeedback && twistPrediction === option.id
                  ? option.correct ? '2px solid #10b981' : '2px solid #ef4444'
                  : showTwistFeedback && option.correct ? '2px solid #10b981'
                  : '2px solid transparent',
                color: colors.textPrimary,
                opacity: showTwistFeedback && !option.correct && twistPrediction !== option.id ? 0.6 : 1,
              }}
            >
              <span style={{ fontWeight: 700 }}>{option.id}.</span>
              <span style={{ marginLeft: '8px', color: colors.textSecondary }}>{option.text}</span>
            </button>
          ))}
        </div>

        {showTwistFeedback && (
          <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(30,41,59,0.7)', borderRadius: '12px', maxWidth: '500px', border: `1px solid ${colors.border}` }}>
            <p style={{ color: twistPrediction === 'C' ? colors.success : colors.warning, fontWeight: 600, marginBottom: '8px' }}>
              {twistPrediction === 'C' ? 'Excellent!' : 'Interesting guess!'}
            </p>
            <p style={{ fontSize: typo.small, color: colors.textSecondary }}>{predictions.twist.explanation}</p>
          </div>
        )}
      </div>
      {renderBottomNav(
        () => goToPhase('review'),
        showTwistFeedback ? () => goToPhase('twist_play') : undefined,
        'Test with Multiple Divers →'
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.bgDark }}>
      {renderNavDots()}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px 120px', overflowY: 'auto' }}>
        <h2 style={{ fontSize: typo.heading, fontWeight: 700, color: '#fbbf24', marginBottom: '8px' }}>Compare Different Divers</h2>
        <p style={{ fontSize: typo.body, color: colors.textSecondary, textAlign: 'center', maxWidth: '500px', marginBottom: '24px' }}>
          Three divers with different bubble sizes. Observe how they respond differently to the same pressure increase. Notice which one sinks first - this reveals the importance of buoyancy margin!
        </p>

        {renderTwistSimulation()}

        {/* Controls */}
        <div style={{ marginTop: '24px', width: '100%', maxWidth: '500px' }}>
          {/* Slider for twist */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Pressure Level - Compare how different divers respond</span>
              <span style={{ fontSize: typo.small, color: '#fbbf24', fontWeight: 600 }}>{Math.round(twistPressure * 100 - 100)}%</span>
            </div>
            <input
              type="range"
              min="100"
              max="150"
              value={twistPressure * 100}
              onChange={(e) => setTwistPressure(parseInt(e.target.value) / 100)}
              style={{
                width: '100%',
                height: '20px',
                touchAction: 'pan-y',
                WebkitAppearance: 'none',
                accentColor: '#3b82f6',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onPointerDown={handleTwistSqueezeStart}
              onPointerUp={handleTwistSqueezeEnd}
              onPointerLeave={handleTwistSqueezeEnd}
              onTouchStart={handleTwistSqueezeStart}
              onTouchEnd={handleTwistSqueezeEnd}
              style={{
                ...buttonBaseStyle,
                minHeight: '52px',
                background: isTwistSqueezing
                  ? 'linear-gradient(135deg, #ec4899, #f59e0b)'
                  : 'linear-gradient(135deg, #f59e0b, #f97316)',
                color: '#ffffff',
                transform: isTwistSqueezing ? 'scale(0.95)' : 'scale(1)',
              }}
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
              style={{ ...secondaryButtonStyle, minHeight: '52px' }}
            >
              Reset
            </button>
          </div>
        </div>

        <div style={{ marginTop: '24px', background: 'rgba(217,119,6,0.1)', borderRadius: '12px', padding: '16px', maxWidth: '500px', border: '1px solid rgba(217,119,6,0.3)' }}>
          <h3 style={{ color: '#fbbf24', fontWeight: 600, marginBottom: '8px' }}>Key Insight</h3>
          <p style={{ fontSize: typo.small, color: colors.textSecondary }}>The diver with the smallest air bubble has the least buoyancy margin. When pressure increases, it loses its ability to float first!</p>
        </div>
      </div>
      {renderBottomNav(() => goToPhase('twist_predict'), () => goToPhase('twist_review'), 'Review Discovery →')}
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.bgDark }}>
      {renderNavDots()}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px 120px', overflowY: 'auto' }}>
        <h2 style={{ fontSize: typo.heading, fontWeight: 700, color: '#fbbf24', marginBottom: '24px' }}>Air Volume and Sinking Depth</h2>

        <div style={{ background: 'linear-gradient(to bottom right, rgba(217,119,6,0.2), rgba(234,88,12,0.2))', borderRadius: '16px', padding: '24px', maxWidth: '700px', width: '100%', marginBottom: '24px', border: '1px solid rgba(217,119,6,0.3)' }}>
          <h3 style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: '#fbbf24', marginBottom: '16px' }}>The Trapped Air Relationship</h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(34,197,94,0.3)' }}>
              <div style={{ color: '#4ade80', fontWeight: 600, marginBottom: '8px' }}>Large Bubble</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: typo.small, color: colors.textSecondary }}>
                <li>* More buoyancy reserve</li>
                <li>* Needs more pressure to sink</li>
                <li>* Sinks last</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(59,130,246,0.3)' }}>
              <div style={{ color: '#60a5fa', fontWeight: 600, marginBottom: '8px' }}>Medium Bubble</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: typo.small, color: colors.textSecondary }}>
                <li>* Moderate reserve</li>
                <li>* Moderate pressure needed</li>
                <li>* Sinks second</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(239,68,68,0.3)' }}>
              <div style={{ color: '#f87171', fontWeight: 600, marginBottom: '8px' }}>Small Bubble</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: typo.small, color: colors.textSecondary }}>
                <li>* Minimal reserve</li>
                <li>* Little pressure needed</li>
                <li>* Sinks first</li>
              </ul>
            </div>
          </div>
          <p style={{ color: '#4ade80', fontWeight: 500, marginTop: '16px', fontSize: typo.small }}>Real submarines and fish must maintain enough air volume for emergency buoyancy!</p>
        </div>

        <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '12px', padding: '16px', maxWidth: '700px', width: '100%', border: `1px solid ${colors.border}` }}>
          <h3 style={{ color: colors.accent, fontWeight: 600, marginBottom: '8px' }}>Why This Matters</h3>
          <p style={{ fontSize: typo.small, color: colors.textSecondary, marginBottom: '8px' }}>Submarines carry compressed air for emergencies. If they descend too deep and lose too much air, they may not have enough reserve buoyancy to surface!</p>
          <p style={{ fontSize: typo.small, color: colors.textSecondary }}>Fish with damaged swim bladders face the same challenge - they constantly struggle to maintain their depth.</p>
        </div>
      </div>
      {renderBottomNav(() => goToPhase('twist_play'), () => goToPhase('transfer'), 'Real-World Applications →')}
    </div>
  );

  const renderTransfer = () => (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.bgDark }}>
      {renderNavDots()}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px 120px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Step 3 of 4 - App {activeAppTab + 1} of {realWorldApplications.length}</span>
        </div>
        <h2 style={{ fontSize: typo.heading, fontWeight: 700, color: colors.textPrimary, marginBottom: '24px' }}>Real-World Applications</h2>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {realWorldApplications.map((app, index) => (
            <button
              key={index}
              onClick={() => setActiveAppTab(index)}
              style={{
                ...buttonBaseStyle,
                padding: '8px 16px',
                background: activeAppTab === index ? colors.accent
                  : completedApps.has(index) ? 'rgba(16,185,129,0.2)'
                  : colors.bgCardLight,
                color: activeAppTab === index ? '#ffffff'
                  : completedApps.has(index) ? colors.success
                  : colors.textSecondary,
                border: completedApps.has(index) ? `1px solid ${colors.success}` : '1px solid transparent',
              }}
            >
              {app.icon} {app.title.split(' ')[0]}
            </button>
          ))}
        </div>

        <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '16px', padding: '24px', maxWidth: '600px', width: '100%', border: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '48px' }}>{realWorldApplications[activeAppTab].icon}</span>
            <div>
              <h3 style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary }}>{realWorldApplications[activeAppTab].title}</h3>
              <p style={{ fontSize: typo.small, color: colors.textMuted }}>{realWorldApplications[activeAppTab].subtitle}</p>
            </div>
          </div>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, marginBottom: '16px', lineHeight: 1.6 }}>{realWorldApplications[activeAppTab].description}</p>
          <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: typo.small, color: colors.accent, fontFamily: 'monospace' }}>{realWorldApplications[activeAppTab].formula}</span>
          </div>
          <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(16,185,129,0.3)' }}>
            <p style={{ fontSize: typo.small, color: colors.success }}>{realWorldApplications[activeAppTab].realExample}</p>
          </div>
          {!completedApps.has(activeAppTab) ? (
            <button
              onClick={() => handleAppComplete(activeAppTab)}
              style={{ ...primaryButtonStyle, marginTop: '16px', width: '100%' }}
            >
              Got It
            </button>
          ) : (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center' }}>
              <span style={{ color: colors.success, fontWeight: 500 }}>Completed!</span>
            </div>
          )}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: typo.small, color: colors.textMuted }}>Progress:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {realWorldApplications.map((_, i) => (
              <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: completedApps.has(i) ? colors.success : colors.border }} />
            ))}
          </div>
          <span style={{ fontSize: typo.small, color: colors.textMuted }}>{completedApps.size}/{realWorldApplications.length}</span>
        </div>

        <div style={{ marginTop: '20px', background: 'rgba(30,41,59,0.3)', borderRadius: '12px', padding: '16px', maxWidth: '600px', width: '100%', border: `1px solid ${colors.border}` }}>
          <p style={{ fontSize: typo.small, color: colors.textSecondary, textAlign: 'center' }}>
            Explore each application to understand how Cartesian diver physics applies to real-world technology. From submarines diving to 300m depths using 6,000-ton ballast systems, to fish swim bladders saving 60% energy, and scuba BCDs operating at 4 atmospheres - buoyancy control is everywhere in nature and engineering!
          </p>
        </div>
      </div>
      {renderBottomNav(
        () => goToPhase('twist_review'),
        () => goToPhase('test'),
        completedApps.size >= realWorldApplications.length ? 'Continue to Test' : `Complete ${realWorldApplications.length - completedApps.size} more to continue`
      )}
    </div>
  );

  const renderTest = () => {
    const q = quizQuestions[currentQuestion];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.bgDark }}>
        {renderNavDots()}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px 120px', overflowY: 'auto' }}>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: typo.small, color: colors.textSecondary }}>Step 4 of 4</span>
          </div>
          <h2 style={{ fontSize: typo.heading, fontWeight: 700, color: colors.textPrimary, marginBottom: '8px' }}>Knowledge Assessment</h2>
          <p style={{ fontSize: typo.small, color: colors.textSecondary, textAlign: 'center', maxWidth: '500px', marginBottom: '16px' }}>
            Test your understanding of Cartesian diver physics, Boyle's Law, Archimedes' Principle, and real-world buoyancy applications like submarines, fish swim bladders, and scuba diving equipment.
          </p>

          {!showTestResults ? (
            <>
              {/* Question progress */}
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: typo.body, color: colors.textPrimary, fontWeight: 600 }}>
                  Question {currentQuestion + 1} of {quizQuestions.length}
                </span>
              </div>

              {/* Score progress */}
              <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: typo.small, color: colors.accent }}>
                  Current Score: {testAnswers.filter((a, i) => a >= 0 && quizQuestions[i].options[a]?.correct).length}/{quizQuestions.length} ({Math.round(testAnswers.filter((a, i) => a >= 0 && quizQuestions[i].options[a]?.correct).length / quizQuestions.length * 100)}%)
                </span>
              </div>

              {/* Progress dots */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
                {quizQuestions.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: testAnswers[i] >= 0 ? colors.success : i === currentQuestion ? colors.accent : colors.border,
                      transition: 'all 0.2s ease',
                    }}
                  />
                ))}
              </div>

              <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '16px', padding: '24px', maxWidth: '600px', width: '100%', border: `1px solid ${colors.border}` }}>
                <p style={{ fontSize: typo.body, color: colors.textPrimary, fontWeight: 500, marginBottom: '20px' }}>
                  Q{currentQuestion + 1}. {q.question}
                </p>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {q.options.map((option, oIndex) => (
                    <button
                      key={oIndex}
                      onClick={() => handleTestAnswer(currentQuestion, oIndex)}
                      style={{
                        ...buttonBaseStyle,
                        padding: '16px',
                        textAlign: 'left',
                        background: testAnswers[currentQuestion] === oIndex ? colors.accent : 'rgba(51,65,85,0.5)',
                        border: testAnswers[currentQuestion] === oIndex ? `2px solid ${colors.accent}` : '2px solid transparent',
                        color: colors.textPrimary,
                        transform: testAnswers[currentQuestion] === oIndex ? 'scale(1.02)' : 'scale(1)',
                      }}
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation between questions */}
              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                {currentQuestion > 0 && (
                  <button
                    onClick={() => setCurrentQuestion(prev => prev - 1)}
                    style={secondaryButtonStyle}
                  >
                    ← Previous
                  </button>
                )}
                {currentQuestion < quizQuestions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestion(prev => prev + 1)}
                    disabled={testAnswers[currentQuestion] < 0}
                    style={{
                      ...primaryButtonStyle,
                      opacity: testAnswers[currentQuestion] < 0 ? 0.5 : 1,
                      cursor: testAnswers[currentQuestion] < 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={() => { setShowTestResults(true); playSound('complete'); emit('test_completed', { score: calculateScore() }); }}
                    disabled={testAnswers.includes(-1)}
                    style={{
                      ...primaryButtonStyle,
                      background: testAnswers.includes(-1) ? colors.bgCardLight : 'linear-gradient(135deg, #10b981, #059669)',
                      opacity: testAnswers.includes(-1) ? 0.5 : 1,
                      cursor: testAnswers.includes(-1) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Submit Answers
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '16px', padding: '32px', maxWidth: '600px', width: '100%', textAlign: 'center', border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>{calculateScore() >= 7 ? '🏆' : '📚'}</div>
              <h3 style={{ fontSize: typo.heading, fontWeight: 700, color: colors.textPrimary, marginBottom: '8px' }}>Score: {calculateScore()}/10</h3>
              <p style={{ fontSize: typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
                {calculateScore() >= 7 ? "Excellent! You've mastered buoyancy physics!" : 'Keep studying! Review and try again.'}
              </p>

              {/* Answer review section */}
              <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
                <h4 style={{ fontSize: typo.body, fontWeight: 600, color: colors.textPrimary, marginBottom: '12px' }}>Answer Review:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  {quizQuestions.map((q, i) => {
                    const isCorrect = testAnswers[i] >= 0 && q.options[testAnswers[i]]?.correct;
                    return (
                      <div key={i} style={{
                        background: isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                        borderRadius: '8px',
                        padding: '8px',
                        textAlign: 'center',
                        border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'}`
                      }}>
                        <span style={{ fontSize: typo.small, color: isCorrect ? colors.success : colors.danger }}>
                          Q{i + 1} {isCorrect ? '✓' : '✗'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {calculateScore() >= 7 ? (
                <button
                  onClick={() => { goToPhase('mastery'); emit('mastery_achieved', { score: calculateScore() }); }}
                  style={{ ...primaryButtonStyle, background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  Claim Your Mastery Badge
                </button>
              ) : (
                <button
                  onClick={() => { setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); setCurrentQuestion(0); goToPhase('review'); }}
                  style={primaryButtonStyle}
                >
                  Review & Try Again
                </button>
              )}
            </div>
          )}
        </div>
        {renderBottomNav(() => goToPhase('transfer'), undefined, undefined)}
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.bgDark }}>
      {renderNavDots()}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px 120px', textAlign: 'center', overflowY: 'auto' }}>
        <div style={{ background: 'linear-gradient(to bottom right, rgba(6,182,212,0.2), rgba(59,130,246,0.2), rgba(20,184,166,0.2))', borderRadius: '24px', padding: '32px', maxWidth: '600px', border: '1px solid rgba(6,182,212,0.3)' }}>
          <div style={{ fontSize: '96px', marginBottom: '24px' }}>🧪</div>
          <h1 style={{ fontSize: typo.title, fontWeight: 700, color: colors.textPrimary, marginBottom: '16px' }}>Buoyancy Master!</h1>
          <p style={{ fontSize: typo.bodyLarge, color: colors.textSecondary, marginBottom: '24px' }}>You've mastered the Cartesian Diver and buoyancy physics!</p>

          <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
            <h3 style={{ color: colors.accent, fontWeight: 600, marginBottom: '12px' }}>You Now Understand:</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ fontSize: typo.body, color: colors.textSecondary, marginBottom: '8px' }}>* How pressure affects gas volume (Boyle's Law)</li>
              <li style={{ fontSize: typo.body, color: colors.textSecondary, marginBottom: '8px' }}>* How displaced fluid creates buoyancy (Archimedes)</li>
              <li style={{ fontSize: typo.body, color: colors.textSecondary, marginBottom: '8px' }}>* Why trapped air volume determines sinking behavior</li>
              <li style={{ fontSize: typo.body, color: colors.textSecondary }}>* Real-world applications in submarines, fish, and diving</li>
            </ul>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '12px', padding: '16px' }}><div style={{ fontSize: '32px', marginBottom: '8px' }}>🚢</div><p style={{ fontSize: typo.small, color: colors.textSecondary }}>Submarines</p></div>
            <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '12px', padding: '16px' }}><div style={{ fontSize: '32px', marginBottom: '8px' }}>🐟</div><p style={{ fontSize: typo.small, color: colors.textSecondary }}>Fish Bladders</p></div>
            <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '12px', padding: '16px' }}><div style={{ fontSize: '32px', marginBottom: '8px' }}>🤿</div><p style={{ fontSize: typo.small, color: colors.textSecondary }}>Scuba Diving</p></div>
            <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '12px', padding: '16px' }}><div style={{ fontSize: '32px', marginBottom: '8px' }}>🎈</div><p style={{ fontSize: typo.small, color: colors.textSecondary }}>Hot Air Balloons</p></div>
          </div>

          <button
            onClick={() => goToPhase('hook')}
            style={secondaryButtonStyle}
          >
            Explore Again
          </button>
        </div>
      </div>
      {renderBottomNav(() => goToPhase('test'), undefined, undefined)}
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
    <div style={{ minHeight: '100vh', background: colors.bgDark, color: colors.textPrimary, position: 'relative', overflow: 'hidden' }}>
      {/* Background gradients */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, #0f172a, #0a1628, #0f172a)' }} />
      <div style={{ position: 'absolute', top: 0, left: '25%', width: '384px', height: '384px', background: 'rgba(6,182,212,0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />
      <div style={{ position: 'absolute', bottom: 0, right: '25%', width: '384px', height: '384px', background: 'rgba(59,130,246,0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />

      {/* Main content */}
      <div style={{ position: 'relative' }}>{renderPhase()}</div>
    </div>
  );
};

export default CartesianDiverRenderer;
