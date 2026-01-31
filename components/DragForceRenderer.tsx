'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// DRAG FORCE - Premium Design with 10-Phase Structure
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

const DragForceRenderer: React.FC<Props> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Simulation states
  const [velocity, setVelocity] = useState(20);
  const [surfaceArea, setSurfaceArea] = useState(0.5);
  const [dragCoefficient, setDragCoefficient] = useState(0.5);
  const [isSimulating, setIsSimulating] = useState(false);
  const [objectY, setObjectY] = useState(50);
  const [currentVelocity, setCurrentVelocity] = useState(0);
  const [currentDrag, setCurrentDrag] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showVectors, setShowVectors] = useState(true);

  // Terminal velocity simulation
  const [terminalObjects, setTerminalObjects] = useState<{y: number; v: number; terminal: number; reached: boolean}[]>([]);
  const [showTerminalSim, setShowTerminalSim] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Premium Design System
  const colors = {
    primary: '#3b82f6',       // blue-500 (air/fluid)
    primaryDark: '#2563eb',   // blue-600
    accent: '#f97316',        // orange-500
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
    dragForce: '#ef4444',     // red-500
    velocity: '#22c55e',      // green-500
    terminal: '#f59e0b',      // amber-500
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

  // Sync with external phase control
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Reset test on entry
  useEffect(() => {
    if (phase === 'test') {
      setTestAnswers(Array(10).fill(-1));
      setTestScore(0);
      setShowTestResults(false);
    }
  }, [phase]);

  // Event emitter
  const emit = useCallback((type: string, details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      type,
      gameType: 'drag_force',
      gameTitle: 'Drag Force',
      details: { phase, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase]);

  // Web Audio API sound system
  const playSound = useCallback((soundType: 'click' | 'correct' | 'incorrect' | 'complete') => {
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
      }
    } catch {
      // Audio not available
    }
  }, []);

  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('click');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    emit('phase_change', { phase: newPhase, phaseLabel: phaseLabels[newPhase] });
  }, [playSound, onPhaseComplete, emit]);

  // Drag force simulation for play phase
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setObjectY(prev => {
        const mass = 5; // kg
        const g = 9.8; // m/s²
        const gravity = mass * g;
        const airDensity = 1.2; // kg/m³

        // Drag force: F_d = 0.5 * ρ * v² * C_d * A
        const dragForce = 0.5 * airDensity * currentVelocity * currentVelocity * dragCoefficient * surfaceArea;
        const netForce = gravity - dragForce;
        const acceleration = netForce / mass;

        const newVelocity = currentVelocity + acceleration * 0.05;
        setCurrentVelocity(Math.max(0, newVelocity));
        setCurrentDrag(dragForce);
        setTimeElapsed(t => t + 0.05);

        const newY = prev + newVelocity * 0.3;

        if (newY >= 340) {
          setIsSimulating(false);
          return 340;
        }

        return newY;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isSimulating, currentVelocity, dragCoefficient, surfaceArea]);

  // Terminal velocity simulation for twist_play phase
  useEffect(() => {
    if (!showTerminalSim) return;

    const interval = setInterval(() => {
      setTerminalObjects(prev => prev.map(obj => {
        if (obj.y >= 320) return obj;

        const mass = 70; // kg
        const g = 9.8;
        const gravity = mass * g;
        const airDensity = 1.2;
        const area = obj.terminal > 50 ? 0.3 : 0.8; // tucked vs spread
        const cd = obj.terminal > 50 ? 0.4 : 1.0;

        const dragForce = 0.5 * airDensity * obj.v * obj.v * cd * area;
        const netForce = gravity - dragForce;
        const acceleration = netForce / mass;

        const newV = obj.v + acceleration * 0.05;
        const newY = obj.y + newV * 0.15;
        const reached = Math.abs(acceleration) < 0.5 || obj.reached;

        return { y: Math.min(320, newY), v: newV, terminal: obj.terminal, reached };
      }));
    }, 50);

    return () => clearInterval(interval);
  }, [showTerminalSim]);

  const startSimulation = useCallback(() => {
    setObjectY(50);
    setCurrentVelocity(velocity);
    setCurrentDrag(0);
    setTimeElapsed(0);
    setIsSimulating(true);
  }, [velocity]);

  const resetSimulation = useCallback(() => {
    setIsSimulating(false);
    setObjectY(50);
    setCurrentVelocity(0);
    setCurrentDrag(0);
    setTimeElapsed(0);
  }, []);

  const startTerminalSim = useCallback(() => {
    setTerminalObjects([
      { y: 50, v: 0, terminal: 55, reached: false }, // spread eagle - lower terminal velocity
      { y: 50, v: 0, terminal: 70, reached: false }  // tucked - higher terminal velocity
    ]);
    setShowTerminalSim(true);
  }, []);

  const resetTerminalSim = useCallback(() => {
    setShowTerminalSim(false);
    setTerminalObjects([]);
  }, []);

  const handlePrediction = useCallback((prediction: string) => {
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'correct' : 'incorrect');
    emit('prediction_made', { prediction, correct: prediction === 'B' });
  }, [playSound, emit]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'correct' : 'incorrect');
    emit('twist_prediction_made', { prediction, correct: prediction === 'C' });
  }, [playSound, emit]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);
    emit('test_answered', { question: questionIndex, answer: answerIndex });
  }, [testAnswers, emit]);

  const questions = [
    {
      q: 'What happens to drag force when you double your speed?',
      opts: [
        { text: 'It doubles', correct: false },
        { text: 'It quadruples (4x)', correct: true },
        { text: 'It stays the same', correct: false },
        { text: 'It halves', correct: false }
      ],
      exp: 'Drag force depends on v², so doubling velocity increases drag by 2² = 4 times.'
    },
    {
      q: 'Which factor is NOT in the drag equation F = ½ρv²CdA?',
      opts: [
        { text: 'Air density (ρ)', correct: false },
        { text: 'Cross-sectional area (A)', correct: false },
        { text: 'Object mass', correct: true },
        { text: 'Drag coefficient (Cd)', correct: false }
      ],
      exp: 'Mass does not appear in the drag equation. Drag depends on shape, area, velocity, and fluid density.'
    },
    {
      q: 'A skydiver spreads their arms and legs. What happens?',
      opts: [
        { text: 'Falls faster due to more weight', correct: false },
        { text: 'Falls slower due to increased drag', correct: true },
        { text: 'No change in falling speed', correct: false },
        { text: 'Falls faster due to less drag', correct: false }
      ],
      exp: 'Spreading out increases cross-sectional area A, which increases drag and slows the fall.'
    },
    {
      q: 'At terminal velocity, what is true about forces?',
      opts: [
        { text: 'Gravity is greater than drag', correct: false },
        { text: 'Drag is greater than gravity', correct: false },
        { text: 'Drag equals gravity (net force = 0)', correct: true },
        { text: 'There are no forces acting', correct: false }
      ],
      exp: 'Terminal velocity is reached when drag equals weight, so net force is zero and acceleration stops.'
    },
    {
      q: 'Why do sports cars have low, streamlined shapes?',
      opts: [
        { text: 'To look faster', correct: false },
        { text: 'To reduce drag coefficient and area', correct: true },
        { text: 'To increase weight', correct: false },
        { text: 'For more interior space', correct: false }
      ],
      exp: 'Streamlined shapes have lower drag coefficients, and lower profiles reduce frontal area.'
    },
    {
      q: 'A parachute works by:',
      opts: [
        { text: 'Creating upward thrust', correct: false },
        { text: 'Eliminating gravity', correct: false },
        { text: 'Greatly increasing air resistance', correct: true },
        { text: 'Making the person lighter', correct: false }
      ],
      exp: 'A parachute has a very large surface area and high drag coefficient, creating massive air resistance.'
    },
    {
      q: 'If air density decreases (higher altitude), drag force:',
      opts: [
        { text: 'Increases', correct: false },
        { text: 'Decreases', correct: true },
        { text: 'Stays the same', correct: false },
        { text: 'Becomes negative', correct: false }
      ],
      exp: 'Drag is directly proportional to air density ρ. Less dense air means less drag.'
    },
    {
      q: 'Which shape has the lowest drag coefficient?',
      opts: [
        { text: 'Flat plate (perpendicular to flow)', correct: false },
        { text: 'Sphere', correct: false },
        { text: 'Streamlined teardrop', correct: true },
        { text: 'Cube', correct: false }
      ],
      exp: 'Streamlined shapes allow air to flow smoothly around them with minimal turbulence.'
    },
    {
      q: 'At 30 mph, a cyclist fights mostly against:',
      opts: [
        { text: 'Gravity', correct: false },
        { text: 'Rolling resistance', correct: false },
        { text: 'Air resistance (drag)', correct: true },
        { text: 'Friction in pedals', correct: false }
      ],
      exp: 'At higher speeds, air resistance dominates because drag increases with v².'
    },
    {
      q: 'Two objects with the same weight but different shapes fall. The one with more drag:',
      opts: [
        { text: 'Reaches terminal velocity faster', correct: true },
        { text: 'Reaches terminal velocity slower', correct: false },
        { text: 'Never reaches terminal velocity', correct: false },
        { text: 'Falls at the same rate', correct: false }
      ],
      exp: 'More drag means the object doesn\'t need to go as fast before drag equals weight.'
    }
  ];

  const calculateScore = useCallback(() => {
    let score = 0;
    testAnswers.forEach((answer, index) => {
      if (questions[index]?.opts[answer]?.correct) score++;
    });
    return score;
  }, [testAnswers]);

  const handleSubmitTest = useCallback(() => {
    const score = calculateScore();
    setTestScore(score);
    setShowTestResults(true);
    playSound(score >= 7 ? 'complete' : 'incorrect');
    emit('test_completed', { score, total: 10 });
  }, [calculateScore, playSound, emit]);

  const handleAppComplete = useCallback((appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    emit('app_explored', { app: appIndex });
  }, [playSound, emit]);

  const applications = [
    {
      title: 'Parachutes',
      description: 'Parachutes maximize drag by using a large canopy (high A) with a high drag coefficient. This creates enough air resistance to slow a person from 200+ km/h to a safe 20 km/h landing speed.',
      color: 'from-blue-600 to-indigo-600',
      icon: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d="M50 10 Q20 10 15 40 L50 55 L85 40 Q80 10 50 10" fill="#ff6600" stroke="#cc5500" strokeWidth="2" />
          <line x1="15" y1="40" x2="50" y2="80" stroke="#333" strokeWidth="2" />
          <line x1="85" y1="40" x2="50" y2="80" stroke="#333" strokeWidth="2" />
          <line x1="50" y1="55" x2="50" y2="80" stroke="#333" strokeWidth="2" />
          <circle cx="50" cy="85" r="8" fill="#ffcc99" />
          <rect x="45" y="90" width="10" height="5" fill="#3366cc" />
        </svg>
      )
    },
    {
      title: 'Vehicle Aerodynamics',
      description: 'Car designers spend millions reducing drag coefficients. Modern cars have Cd values around 0.25-0.35. A 10% reduction in drag can improve fuel efficiency by 5% at highway speeds.',
      color: 'from-green-600 to-teal-600',
      icon: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d="M10 60 L20 60 L25 45 L70 40 L90 50 L90 65 L10 65 Z" fill="#3366cc" />
          <path d="M28 45 L65 42 L70 50 L30 52 Z" fill="#88ccff" />
          <circle cx="25" cy="65" r="8" fill="#333" />
          <circle cx="75" cy="65" r="8" fill="#333" />
          <path d="M5 45 Q50 35 95 45" stroke="#00ff00" strokeWidth="2" strokeDasharray="3,3" fill="none" opacity="0.7" />
        </svg>
      )
    },
    {
      title: 'Skydiving',
      description: 'Skydivers control their speed by changing body position. Spread eagle: terminal velocity ~55 m/s. Head-down dive: terminal velocity ~70+ m/s. This is due to changes in both A and Cd.',
      color: 'from-orange-600 to-red-600',
      icon: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <ellipse cx="50" cy="50" rx="25" ry="12" fill="#ff6600" />
          <circle cx="50" cy="35" r="10" fill="#ffcc99" />
          <ellipse cx="50" cy="33" rx="12" ry="8" fill="#333" />
          <line x1="25" y1="50" x2="5" y2="40" stroke="#ff6600" strokeWidth="6" strokeLinecap="round" />
          <line x1="75" y1="50" x2="95" y2="40" stroke="#ff6600" strokeWidth="6" strokeLinecap="round" />
          <line x1="42" y1="62" x2="30" y2="85" stroke="#333" strokeWidth="6" strokeLinecap="round" />
          <line x1="58" y1="62" x2="70" y2="85" stroke="#333" strokeWidth="6" strokeLinecap="round" />
        </svg>
      )
    },
    {
      title: 'Sports Equipment',
      description: 'Golf balls have dimples to create turbulent boundary layers that reduce drag. Cyclists wear aero suits and helmets to minimize frontal area and drag coefficient.',
      color: 'from-purple-600 to-pink-600',
      icon: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="25" fill="white" stroke="#ccc" strokeWidth="2" />
          <circle cx="42" cy="42" r="3" fill="#ddd" />
          <circle cx="58" cy="42" r="3" fill="#ddd" />
          <circle cx="50" cy="55" r="3" fill="#ddd" />
          <circle cx="42" cy="58" r="3" fill="#ddd" />
          <circle cx="58" cy="58" r="3" fill="#ddd" />
          <circle cx="35" cy="50" r="3" fill="#ddd" />
          <circle cx="65" cy="50" r="3" fill="#ddd" />
        </svg>
      )
    }
  ];

  const renderPhaseContent = () => {
    switch (phase) {
      // ========== HOOK PHASE ==========
      case 'hook':
        return (
          <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/10 border border-sky-500/20 rounded-full mb-8">
              <span className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-sky-400 tracking-wide">FLUID DYNAMICS</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-sky-100 to-cyan-200 bg-clip-text text-transparent">
              Drag Force
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-8 leading-relaxed">
              The invisible force that fights your motion through air
            </p>

            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-6 max-w-2xl border border-slate-700/50 shadow-2xl shadow-sky-500/5 mb-8">
              <div className="relative w-full max-w-md h-64 rounded-xl overflow-hidden mx-auto">
                <svg viewBox="0 0 400 300" className="w-full h-full">
                  <defs>
                    {/* Premium sky gradient with depth */}
                    <linearGradient id="dragHookSkyBg" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#87ceeb" stopOpacity="0.5" />
                      <stop offset="25%" stopColor="#7ec8e3" stopOpacity="0.45" />
                      <stop offset="50%" stopColor="#5ba3c6" stopOpacity="0.4" />
                      <stop offset="75%" stopColor="#4a90a4" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#3d7a8e" stopOpacity="0.3" />
                    </linearGradient>

                    {/* Cloud gradient */}
                    <radialGradient id="dragHookCloudGrad" cx="40%" cy="40%" r="60%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                      <stop offset="50%" stopColor="#f0f9ff" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.4" />
                    </radialGradient>

                    {/* Skydiver suit gradient */}
                    <radialGradient id="dragHookSuitGrad" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#ff8844" />
                      <stop offset="50%" stopColor="#ff6600" />
                      <stop offset="100%" stopColor="#dd5500" />
                    </radialGradient>

                    {/* Skin tone gradient */}
                    <radialGradient id="dragHookSkinGrad" cx="40%" cy="30%" r="60%">
                      <stop offset="0%" stopColor="#ffdab3" />
                      <stop offset="50%" stopColor="#ffcc99" />
                      <stop offset="100%" stopColor="#e6b380" />
                    </radialGradient>

                    {/* Helmet gradient */}
                    <radialGradient id="dragHookHelmetGrad" cx="35%" cy="30%" r="65%">
                      <stop offset="0%" stopColor="#4b5563" />
                      <stop offset="50%" stopColor="#374151" />
                      <stop offset="100%" stopColor="#1f2937" />
                    </radialGradient>

                    {/* Air resistance arrow gradient (upward) */}
                    <linearGradient id="dragHookAirGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#4ade80" />
                      <stop offset="50%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#16a34a" />
                    </linearGradient>

                    {/* Gravity arrow gradient (downward) */}
                    <linearGradient id="dragHookGravityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f87171" />
                      <stop offset="50%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>

                    {/* Arrow glow filter */}
                    <filter id="dragHookArrowGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Skydiver glow filter */}
                    <filter id="dragHookSkydiverGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Premium sky background */}
                  <rect x="0" y="0" width="400" height="300" fill="url(#dragHookSkyBg)" />

                  {/* Premium clouds with gradient */}
                  <ellipse cx="80" cy="40" rx="45" ry="22" fill="url(#dragHookCloudGrad)" />
                  <ellipse cx="60" cy="45" rx="25" ry="15" fill="url(#dragHookCloudGrad)" />
                  <ellipse cx="100" cy="48" rx="20" ry="12" fill="url(#dragHookCloudGrad)" />

                  <ellipse cx="320" cy="80" rx="55" ry="28" fill="url(#dragHookCloudGrad)" />
                  <ellipse cx="295" cy="85" rx="30" ry="18" fill="url(#dragHookCloudGrad)" />
                  <ellipse cx="350" cy="88" rx="25" ry="15" fill="url(#dragHookCloudGrad)" />

                  {/* Premium 3D skydiver */}
                  <g transform="translate(200, 140)" filter="url(#dragHookSkydiverGlow)">
                    {/* Shadow */}
                    <ellipse cx="3" cy="3" rx="28" ry="16" fill="rgba(0,0,0,0.2)" />
                    {/* Body */}
                    <ellipse cx="0" cy="0" rx="28" ry="16" fill="url(#dragHookSuitGrad)" stroke="#cc5500" strokeWidth="1" />
                    {/* Head with helmet */}
                    <circle cx="0" cy="-22" r="14" fill="url(#dragHookHelmetGrad)" />
                    <circle cx="0" cy="-21" r="9" fill="url(#dragHookSkinGrad)" />
                    {/* Arms spread */}
                    <line x1="-28" y1="-5" x2="-65" y2="-18" stroke="url(#dragHookSuitGrad)" strokeWidth="9" strokeLinecap="round" />
                    <line x1="28" y1="-5" x2="65" y2="-18" stroke="url(#dragHookSuitGrad)" strokeWidth="9" strokeLinecap="round" />
                    {/* Hands */}
                    <circle cx="-68" cy="-20" r="5" fill="url(#dragHookSkinGrad)" />
                    <circle cx="68" cy="-20" r="5" fill="url(#dragHookSkinGrad)" />
                    {/* Legs */}
                    <line x1="-12" y1="16" x2="-38" y2="45" stroke="#1f2937" strokeWidth="9" strokeLinecap="round" />
                    <line x1="12" y1="16" x2="38" y2="45" stroke="#1f2937" strokeWidth="9" strokeLinecap="round" />
                    {/* Feet */}
                    <ellipse cx="-42" cy="50" rx="7" ry="4" fill="#1f2937" />
                    <ellipse cx="42" cy="50" rx="7" ry="4" fill="#1f2937" />
                  </g>

                  {/* Air resistance arrow with glow */}
                  <g filter="url(#dragHookArrowGlow)">
                    <line x1="200" y1="110" x2="200" y2="75" stroke="url(#dragHookAirGrad)" strokeWidth="5" strokeLinecap="round" />
                    <polygon points="200,68 194,80 206,80" fill="#22c55e" />
                  </g>

                  {/* Gravity arrow with glow and animation */}
                  <g filter="url(#dragHookArrowGlow)">
                    <line x1="200" y1="200" x2="200" y2="250" stroke="url(#dragHookGravityGrad)" strokeWidth="5" strokeLinecap="round">
                      <animate attributeName="stroke-opacity" values="1;0.6;1" dur="1.5s" repeatCount="indefinite" />
                    </line>
                    <polygon points="200,258 194,246 206,246" fill="#ef4444">
                      <animate attributeName="opacity" values="1;0.6;1" dur="1.5s" repeatCount="indefinite" />
                    </polygon>
                  </g>
                </svg>

                {/* Labels outside SVG using typo system */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    bottom: '8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: typo.body,
                    color: colors.dragForce,
                    fontWeight: 'bold'
                  }}
                >
                  Gravity
                </div>
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: '45px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: typo.body,
                    color: colors.success,
                    fontWeight: 'bold'
                  }}
                >
                  Air Resistance
                </div>
              </div>
              <p className="text-lg text-slate-300 mt-4 mb-2">
                Ever wondered why a feather falls slowly but a rock plummets fast?
              </p>
              <p className="text-base text-cyan-400">
                Drag force is the air&apos;s resistance to objects moving through it. It depends on speed, shape, and size!
              </p>
            </div>

            <button
              onClick={() => goToPhase('predict')}
              style={{ zIndex: 10, position: 'relative' }}
              className="group px-8 py-4 bg-gradient-to-r from-sky-600 to-cyan-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                Explore Drag Force
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
          </div>
        );

      // ========== PREDICT PHASE ==========
      case 'predict':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-sky-400 mb-6">Make Your Prediction</h2>
            <p className="text-lg text-slate-200 mb-6 text-center max-w-lg">
              An object is falling through air. If you <span className="text-yellow-400 font-bold">double its speed</span>, what happens to the drag force acting on it?
            </p>
            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'A', text: 'Drag force doubles (2x)' },
                { id: 'B', text: 'Drag force quadruples (4x)' },
                { id: 'C', text: 'Drag force stays the same' },
                { id: 'D', text: 'Drag force is cut in half' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => handlePrediction(option.id)}
                  disabled={showPredictionFeedback}
                  style={{ zIndex: 10, position: 'relative' }}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showPredictionFeedback && option.id === 'B'
                      ? 'bg-green-600 text-white'
                      : showPredictionFeedback && selectedPrediction === option.id
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  <span className="font-bold">{option.id}.</span> {option.text}
                </button>
              ))}
            </div>
            {showPredictionFeedback && (
              <div className="bg-slate-800 p-4 rounded-xl mb-4 max-w-md">
                <p className={`font-bold ${selectedPrediction === 'B' ? 'text-green-400' : 'text-sky-400'}`}>
                  {selectedPrediction === 'B' ? 'Correct!' : 'Not quite!'}
                </p>
                <p className="text-slate-300 mb-2">
                  Drag force depends on velocity <span className="text-yellow-400 font-bold">squared</span>!
                </p>
                <p className="text-slate-400 text-sm">
                  F_drag = ½ρv²CdA. Double the velocity means 2² = 4 times the drag!
                </p>
                <button
                  onClick={() => goToPhase('play')}
                  style={{ zIndex: 10, position: 'relative' }}
                  className="mt-4 px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl"
                >
                  Try the Simulation
                </button>
              </div>
            )}
          </div>
        );

      // ========== PLAY PHASE ==========
      case 'play':
        const airDensity = 1.2;
        const calculatedDrag = 0.5 * airDensity * velocity * velocity * dragCoefficient * surfaceArea;

        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-sky-400 mb-4">Drag Force Simulator</h2>
            <p className="text-slate-400 mb-4">Adjust parameters and see how drag force changes</p>

            <div className="relative w-full max-w-lg h-80 bg-gradient-to-b from-sky-400/20 to-sky-900/40 rounded-xl mb-4 overflow-hidden">
              <svg viewBox="0 0 400 400" className="w-full h-full">
                <defs>
                  {/* Premium sky gradient with depth */}
                  <linearGradient id="dragSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#87ceeb" stopOpacity="0.5" />
                    <stop offset="25%" stopColor="#5ba3c6" stopOpacity="0.45" />
                    <stop offset="50%" stopColor="#3d7a9e" stopOpacity="0.5" />
                    <stop offset="75%" stopColor="#1e5a7a" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.7" />
                  </linearGradient>

                  {/* Premium ground gradient */}
                  <linearGradient id="dragGroundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4a7c44" />
                    <stop offset="30%" stopColor="#3d6b38" />
                    <stop offset="70%" stopColor="#2d5a27" />
                    <stop offset="100%" stopColor="#1e4a1a" />
                  </linearGradient>

                  {/* 3D falling object gradient */}
                  <radialGradient id="dragObjectGrad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#ffaa44" />
                    <stop offset="25%" stopColor="#ff8833" />
                    <stop offset="50%" stopColor="#ff6600" />
                    <stop offset="75%" stopColor="#dd5500" />
                    <stop offset="100%" stopColor="#aa4400" />
                  </radialGradient>

                  {/* Object highlight for 3D effect */}
                  <radialGradient id="dragObjectHighlight" cx="30%" cy="25%" r="40%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
                    <stop offset="50%" stopColor="#ffdd99" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#ff8833" stopOpacity="0" />
                  </radialGradient>

                  {/* Air flow streamline gradient */}
                  <linearGradient id="dragAirFlowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
                    <stop offset="20%" stopColor="#38bdf8" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.6" />
                    <stop offset="80%" stopColor="#38bdf8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                  </linearGradient>

                  {/* Weight arrow gradient */}
                  <linearGradient id="dragWeightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f87171" />
                    <stop offset="50%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>

                  {/* Drag arrow gradient */}
                  <linearGradient id="dragForceGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#4ade80" />
                    <stop offset="50%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#16a34a" />
                  </linearGradient>

                  {/* Glow filter for arrows */}
                  <filter id="dragArrowGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Glow filter for object */}
                  <filter id="dragObjectGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Terminal velocity indicator gradient */}
                  <linearGradient id="dragTerminalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
                    <stop offset="20%" stopColor="#f59e0b" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
                    <stop offset="80%" stopColor="#f59e0b" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Premium sky background */}
                <rect x="0" y="0" width="400" height="400" fill="url(#dragSkyGrad)" />

                {/* Air flow streamlines */}
                {isSimulating && (
                  <g opacity="0.7">
                    {[80, 140, 200, 260, 320].map((xPos, i) => (
                      <g key={i}>
                        <line
                          x1={xPos}
                          y1={objectY - 80}
                          x2={xPos}
                          y2={objectY + 30}
                          stroke="url(#dragAirFlowGrad)"
                          strokeWidth="2"
                          strokeDasharray="8,4"
                        >
                          <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="0.5s" repeatCount="indefinite" />
                        </line>
                      </g>
                    ))}
                  </g>
                )}

                {/* Premium ground with gradient */}
                <rect x="0" y="360" width="400" height="40" fill="url(#dragGroundGrad)" />
                <line x1="0" y1="360" x2="400" y2="360" stroke="#5a9a50" strokeWidth="2" />

                {/* 3D Falling object with glow */}
                <g transform={`translate(200, ${objectY})`} filter={isSimulating ? "url(#dragObjectGlow)" : undefined}>
                  {/* Shadow */}
                  <ellipse
                    cx="3"
                    cy="3"
                    rx={15 + surfaceArea * 20}
                    ry={10 + surfaceArea * 10}
                    fill="rgba(0,0,0,0.3)"
                  />
                  {/* Main body with 3D gradient */}
                  <ellipse
                    cx="0"
                    cy="0"
                    rx={15 + surfaceArea * 20}
                    ry={10 + surfaceArea * 10}
                    fill="url(#dragObjectGrad)"
                    stroke="#aa4400"
                    strokeWidth="2"
                  />
                  {/* 3D highlight */}
                  <ellipse
                    cx={-5 - surfaceArea * 5}
                    cy={-3 - surfaceArea * 3}
                    rx={(15 + surfaceArea * 20) * 0.5}
                    ry={(10 + surfaceArea * 10) * 0.4}
                    fill="url(#dragObjectHighlight)"
                  />
                </g>

                {/* Force vectors with glow effects */}
                {showVectors && objectY < 340 && (
                  <>
                    {/* Weight arrow with glow */}
                    <g filter="url(#dragArrowGlow)">
                      <line
                        x1="200"
                        y1={objectY + 25}
                        x2="200"
                        y2={objectY + 25 + 40}
                        stroke="url(#dragWeightGrad)"
                        strokeWidth="5"
                        strokeLinecap="round"
                      />
                      <polygon
                        points={`200,${objectY + 72} 193,${objectY + 60} 207,${objectY + 60}`}
                        fill="#ef4444"
                      />
                    </g>

                    {/* Drag arrow with glow */}
                    {currentDrag > 0 && (
                      <g filter="url(#dragArrowGlow)">
                        <line
                          x1="200"
                          y1={objectY - 20}
                          x2="200"
                          y2={objectY - 20 - Math.min(currentDrag / 10, 50)}
                          stroke="url(#dragForceGrad)"
                          strokeWidth="5"
                          strokeLinecap="round"
                        />
                        <polygon
                          points={`200,${objectY - 27 - Math.min(currentDrag / 10, 50)} 193,${objectY - 15 - Math.min(currentDrag / 10, 50)} 207,${objectY - 15 - Math.min(currentDrag / 10, 50)}`}
                          fill="#22c55e"
                        />
                      </g>
                    )}

                    {/* Terminal velocity indicator line */}
                    {Math.abs(currentDrag - 49) < 5 && currentDrag > 0 && (
                      <g opacity="0.8">
                        <line
                          x1="50"
                          y1={objectY}
                          x2="150"
                          y2={objectY}
                          stroke="url(#dragTerminalGrad)"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        <line
                          x1="250"
                          y1={objectY}
                          x2="350"
                          y2={objectY}
                          stroke="url(#dragTerminalGrad)"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </g>
                    )}
                  </>
                )}

                {/* Data panel background with glassmorphism effect */}
                <rect x="10" y="10" width="160" height="110" fill="rgba(0,0,0,0.7)" rx="8" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              </svg>

              {/* Data panel labels outside SVG using typo system */}
              <div
                className="absolute pointer-events-none"
                style={{
                  top: '20px',
                  left: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ fontSize: typo.small, color: colors.textPrimary }}>
                  Speed: <span style={{ color: colors.velocity, fontWeight: 'bold' }}>{currentVelocity.toFixed(1)} m/s</span>
                </div>
                <div style={{ fontSize: typo.small, color: colors.textPrimary }}>
                  Drag: <span style={{ color: colors.success, fontWeight: 'bold' }}>{currentDrag.toFixed(1)} N</span>
                </div>
                <div style={{ fontSize: typo.small, color: colors.textPrimary }}>
                  Time: <span style={{ fontWeight: 'bold' }}>{timeElapsed.toFixed(1)}s</span>
                </div>
                <div style={{ fontSize: typo.label, color: colors.textMuted }}>
                  Predicted: {calculatedDrag.toFixed(1)} N
                </div>
              </div>

              {/* Force vector labels outside SVG */}
              {showVectors && objectY < 340 && (
                <>
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: '52%',
                      top: `${(objectY + 50) / 4 + 5}%`,
                      fontSize: typo.label,
                      color: colors.dragForce,
                      fontWeight: 'bold'
                    }}
                  >
                    Weight
                  </div>
                  {currentDrag > 0 && (
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: '52%',
                        top: `${(objectY - 35) / 4 + 5}%`,
                        fontSize: typo.label,
                        color: colors.success,
                        fontWeight: 'bold'
                      }}
                    >
                      Drag
                    </div>
                  )}
                  {Math.abs(currentDrag - 49) < 5 && currentDrag > 0 && (
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: '50%',
                        transform: 'translateX(-50%)',
                        top: `${(objectY - 25) / 4 + 5}%`,
                        fontSize: typo.label,
                        color: colors.terminal,
                        fontWeight: 'bold',
                        background: 'rgba(0,0,0,0.5)',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}
                    >
                      Terminal Velocity!
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-lg mb-4">
              <div className="bg-slate-800 p-3 rounded-lg">
                <label className="text-sm text-slate-400">Initial Velocity (m/s)</label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={velocity}
                  onChange={(e) => setVelocity(Number(e.target.value))}
                  className="w-full mt-1"
                />
                <span className="text-sky-400 font-bold">{velocity}</span>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <label className="text-sm text-slate-400">Surface Area (m²)</label>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.1"
                  value={surfaceArea}
                  onChange={(e) => setSurfaceArea(Number(e.target.value))}
                  className="w-full mt-1"
                />
                <span className="text-sky-400 font-bold">{surfaceArea.toFixed(1)}</span>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <label className="text-sm text-slate-400">Drag Coefficient</label>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.1"
                  value={dragCoefficient}
                  onChange={(e) => setDragCoefficient(Number(e.target.value))}
                  className="w-full mt-1"
                />
                <span className="text-sky-400 font-bold">{dragCoefficient.toFixed(1)}</span>
              </div>
            </div>

            <div className="flex gap-3 mb-4">
              <button
                onClick={startSimulation}
                disabled={isSimulating}
                style={{ zIndex: 10, position: 'relative' }}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-bold rounded-xl"
              >
                {isSimulating ? 'Falling...' : 'Drop Object'}
              </button>
              <button
                onClick={resetSimulation}
                style={{ zIndex: 10, position: 'relative' }}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-xl"
              >
                Reset
              </button>
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={showVectors}
                  onChange={(e) => setShowVectors(e.target.checked)}
                />
                Show Forces
              </label>
            </div>

            <button
              onClick={() => goToPhase('review')}
              style={{ zIndex: 10, position: 'relative' }}
              className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl"
            >
              Review the Physics
            </button>
          </div>
        );

      // ========== REVIEW PHASE ==========
      case 'review':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-sky-400 mb-6">The Physics of Drag Force</h2>

            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 rounded-xl max-w-2xl mb-6 border border-slate-700/50">
              <h3 className="text-xl font-bold text-cyan-400 mb-4 text-center">The Drag Equation</h3>
              <div className="bg-slate-900 p-4 rounded-lg text-center mb-4">
                <span className="text-2xl font-mono text-sky-400">F<sub>drag</sub> = ½ρv²C<sub>d</sub>A</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-cyan-400 font-bold">ρ (rho)</span>
                  <p className="text-slate-300">Air density (kg/m³)</p>
                  <p className="text-slate-500">~1.2 at sea level</p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-yellow-400 font-bold">v²</span>
                  <p className="text-slate-300">Velocity squared</p>
                  <p className="text-slate-500">Most important factor!</p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-green-400 font-bold">C<sub>d</sub></span>
                  <p className="text-slate-300">Drag coefficient</p>
                  <p className="text-slate-500">Shape-dependent (0.04 - 2.0)</p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-purple-400 font-bold">A</span>
                  <p className="text-slate-300">Cross-sectional area</p>
                  <p className="text-slate-500">Frontal area facing flow</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 p-4 rounded-xl max-w-lg mb-6 border border-yellow-500/30">
              <h4 className="font-bold text-yellow-400 mb-2">Key Insight: The v² Effect</h4>
              <p className="text-slate-300 text-sm">
                Because drag depends on v², doubling speed quadruples drag. At highway speeds,
                most of a car&apos;s fuel is spent fighting air resistance!
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-800/50 p-2 rounded">
                  <div className="text-slate-400">10 m/s</div>
                  <div className="text-green-400 font-bold">1x drag</div>
                </div>
                <div className="bg-slate-800/50 p-2 rounded">
                  <div className="text-slate-400">20 m/s</div>
                  <div className="text-green-400 font-bold">4x drag</div>
                </div>
                <div className="bg-slate-800/50 p-2 rounded">
                  <div className="text-slate-400">30 m/s</div>
                  <div className="text-green-400 font-bold">9x drag</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => goToPhase('twist_predict')}
              style={{ zIndex: 10, position: 'relative' }}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl"
            >
              Ready for the Twist?
            </button>
          </div>
        );

      // ========== TWIST PREDICT PHASE ==========
      case 'twist_predict':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">The Twist: Terminal Velocity</h2>
            <div className="bg-slate-800 p-4 rounded-xl mb-6 max-w-lg">
              <p className="text-slate-200 text-center mb-4">
                A skydiver jumps from a plane and falls faster and faster... but eventually they stop accelerating
                and fall at a <span className="text-purple-400 font-bold">constant speed</span>.
              </p>
              <p className="text-xl text-cyan-300 text-center font-bold">
                Why does a falling object eventually stop speeding up?
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'A', text: 'Gravity decreases at lower altitudes' },
                { id: 'B', text: 'The air gets thicker near the ground' },
                { id: 'C', text: 'Drag force increases until it equals weight' },
                { id: 'D', text: 'The person runs out of potential energy' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => handleTwistPrediction(option.id)}
                  disabled={showTwistFeedback}
                  style={{ zIndex: 10, position: 'relative' }}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showTwistFeedback && option.id === 'C'
                      ? 'bg-green-600 text-white'
                      : showTwistFeedback && twistPrediction === option.id
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  <span className="font-bold">{option.id}.</span> {option.text}
                </button>
              ))}
            </div>
            {showTwistFeedback && (
              <div className="bg-slate-800 p-4 rounded-xl max-w-md">
                <p className={`font-bold ${twistPrediction === 'C' ? 'text-green-400' : 'text-purple-400'}`}>
                  {twistPrediction === 'C' ? 'Exactly right!' : 'Good thinking, but not quite!'}
                </p>
                <p className="text-slate-300">
                  As speed increases, drag force (which depends on v²) grows until it equals the object&apos;s weight.
                  At that point, net force = 0, so acceleration = 0. This is <span className="text-yellow-400">terminal velocity</span>.
                </p>
                <button
                  onClick={() => goToPhase('twist_play')}
                  style={{ zIndex: 10, position: 'relative' }}
                  className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl"
                >
                  See Terminal Velocity
                </button>
              </div>
            )}
          </div>
        );

      // ========== TWIST PLAY PHASE ==========
      case 'twist_play':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Terminal Velocity Simulation</h2>
            <p className="text-slate-400 mb-4">Watch two skydivers reach different terminal velocities based on body position</p>

            <div className="relative w-full max-w-lg h-80 bg-gradient-to-b from-sky-400/20 to-sky-900/40 rounded-xl mb-4 overflow-hidden">
              <svg viewBox="0 0 400 400" className="w-full h-full">
                <defs>
                  {/* Premium sky gradient for terminal velocity sim */}
                  <linearGradient id="dragTermSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#87ceeb" stopOpacity="0.5" />
                    <stop offset="25%" stopColor="#5ba3c6" stopOpacity="0.45" />
                    <stop offset="50%" stopColor="#3d7a9e" stopOpacity="0.5" />
                    <stop offset="75%" stopColor="#1e5a7a" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.7" />
                  </linearGradient>

                  {/* Premium ground gradient */}
                  <linearGradient id="dragTermGroundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4a7c44" />
                    <stop offset="50%" stopColor="#3d6b38" />
                    <stop offset="100%" stopColor="#2d5a27" />
                  </linearGradient>

                  {/* Skydiver suit gradient - spread eagle */}
                  <radialGradient id="dragSuitSpreadGrad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="50%" stopColor="#16a34a" />
                    <stop offset="100%" stopColor="#15803d" />
                  </radialGradient>

                  {/* Skydiver suit gradient - tucked */}
                  <radialGradient id="dragSuitTuckedGrad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#fb923c" />
                    <stop offset="50%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </radialGradient>

                  {/* Skin tone gradient */}
                  <radialGradient id="dragSkinGrad" cx="40%" cy="30%" r="60%">
                    <stop offset="0%" stopColor="#ffdab3" />
                    <stop offset="50%" stopColor="#ffcc99" />
                    <stop offset="100%" stopColor="#e6b380" />
                  </radialGradient>

                  {/* Helmet gradient */}
                  <radialGradient id="dragHelmetGrad" cx="35%" cy="30%" r="65%">
                    <stop offset="0%" stopColor="#4b5563" />
                    <stop offset="50%" stopColor="#374151" />
                    <stop offset="100%" stopColor="#1f2937" />
                  </radialGradient>

                  {/* Terminal velocity reached glow */}
                  <filter id="dragTerminalGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Air flow around skydivers */}
                  <linearGradient id="dragTermAirFlow" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
                    <stop offset="30%" stopColor="#38bdf8" stopOpacity="0.3" />
                    <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Premium sky background */}
                <rect x="0" y="0" width="400" height="400" fill="url(#dragTermSkyGrad)" />

                {/* Air flow streamlines when falling */}
                {showTerminalSim && terminalObjects.length >= 2 && (
                  <g opacity="0.5">
                    {/* Streamlines around spread eagle */}
                    {[80, 100, 140, 160].map((xPos, i) => (
                      <line
                        key={`spread-${i}`}
                        x1={xPos}
                        y1={terminalObjects[0].y - 60}
                        x2={xPos}
                        y2={terminalObjects[0].y + 40}
                        stroke="url(#dragTermAirFlow)"
                        strokeWidth="2"
                        strokeDasharray="6,4"
                      >
                        <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="0.4s" repeatCount="indefinite" />
                      </line>
                    ))}
                    {/* Streamlines around tucked */}
                    {[260, 275, 285, 300].map((xPos, i) => (
                      <line
                        key={`tucked-${i}`}
                        x1={xPos}
                        y1={terminalObjects[1].y - 60}
                        x2={xPos}
                        y2={terminalObjects[1].y + 40}
                        stroke="url(#dragTermAirFlow)"
                        strokeWidth="2"
                        strokeDasharray="6,4"
                      >
                        <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="0.3s" repeatCount="indefinite" />
                      </line>
                    ))}
                  </g>
                )}

                {/* Premium ground */}
                <rect x="0" y="360" width="400" height="40" fill="url(#dragTermGroundGrad)" />
                <line x1="0" y1="360" x2="400" y2="360" stroke="#5a9a50" strokeWidth="2" />

                {terminalObjects.length >= 2 && (
                  <>
                    {/* Spread eagle skydiver with premium graphics */}
                    <g
                      transform={`translate(120, ${terminalObjects[0].y})`}
                      filter={terminalObjects[0].reached ? "url(#dragTerminalGlow)" : undefined}
                    >
                      {/* Body shadow */}
                      <ellipse cx="3" cy="3" rx="25" ry="12" fill="rgba(0,0,0,0.3)" />
                      {/* Body */}
                      <ellipse cx="0" cy="0" rx="25" ry="12" fill="url(#dragSuitSpreadGrad)" stroke="#15803d" strokeWidth="1" />
                      {/* Head with helmet */}
                      <circle cx="0" cy="-15" r="10" fill="url(#dragHelmetGrad)" />
                      <circle cx="0" cy="-14" r="6" fill="url(#dragSkinGrad)" />
                      {/* Arms spread */}
                      <line x1="-25" y1="0" x2="-48" y2="-8" stroke="url(#dragSuitSpreadGrad)" strokeWidth="6" strokeLinecap="round" />
                      <line x1="25" y1="0" x2="48" y2="-8" stroke="url(#dragSuitSpreadGrad)" strokeWidth="6" strokeLinecap="round" />
                      {/* Hands */}
                      <circle cx="-50" cy="-9" r="4" fill="url(#dragSkinGrad)" />
                      <circle cx="50" cy="-9" r="4" fill="url(#dragSkinGrad)" />
                      {/* Legs spread */}
                      <line x1="-10" y1="12" x2="-25" y2="32" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" />
                      <line x1="10" y1="12" x2="25" y2="32" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" />
                      {/* Feet */}
                      <ellipse cx="-27" cy="35" rx="5" ry="3" fill="#1f2937" />
                      <ellipse cx="27" cy="35" rx="5" ry="3" fill="#1f2937" />
                    </g>

                    {/* Tucked skydiver with premium graphics */}
                    <g
                      transform={`translate(280, ${terminalObjects[1].y})`}
                      filter={terminalObjects[1].reached ? "url(#dragTerminalGlow)" : undefined}
                    >
                      {/* Body shadow */}
                      <ellipse cx="3" cy="3" rx="12" ry="22" fill="rgba(0,0,0,0.3)" />
                      {/* Body - tucked position */}
                      <ellipse cx="0" cy="0" rx="12" ry="22" fill="url(#dragSuitTuckedGrad)" stroke="#ea580c" strokeWidth="1" />
                      {/* Head with helmet */}
                      <circle cx="0" cy="-20" r="10" fill="url(#dragHelmetGrad)" />
                      <circle cx="0" cy="-19" r="6" fill="url(#dragSkinGrad)" />
                      {/* Arms tucked in */}
                      <ellipse cx="-8" cy="0" rx="4" ry="8" fill="url(#dragSuitTuckedGrad)" />
                      <ellipse cx="8" cy="0" rx="4" ry="8" fill="url(#dragSuitTuckedGrad)" />
                      {/* Legs tucked */}
                      <ellipse cx="0" cy="18" rx="10" ry="8" fill="#1f2937" />
                    </g>
                  </>
                )}
              </svg>

              {/* Labels outside SVG using typo system */}
              <div
                className="absolute pointer-events-none"
                style={{
                  top: '16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '80px'
                }}
              >
                <div style={{ fontSize: typo.small, color: colors.success, fontWeight: 'bold', textAlign: 'center' }}>
                  Spread Eagle
                </div>
                <div style={{ fontSize: typo.small, color: colors.accent, fontWeight: 'bold', textAlign: 'center' }}>
                  Tucked
                </div>
              </div>

              {/* Velocity labels outside SVG */}
              {terminalObjects.length >= 2 && (
                <>
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: '25%',
                      transform: 'translateX(-50%)',
                      top: `${(terminalObjects[0].y + 55) / 4 + 5}%`,
                      fontSize: typo.small,
                      color: terminalObjects[0].reached ? colors.terminal : colors.textPrimary,
                      fontWeight: 'bold',
                      textAlign: 'center',
                      background: 'rgba(0,0,0,0.5)',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}
                  >
                    {terminalObjects[0].v.toFixed(0)} m/s {terminalObjects[0].reached && '(Terminal!)'}
                  </div>
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: '75%',
                      transform: 'translateX(-50%)',
                      top: `${(terminalObjects[1].y + 55) / 4 + 5}%`,
                      fontSize: typo.small,
                      color: terminalObjects[1].reached ? colors.terminal : colors.textPrimary,
                      fontWeight: 'bold',
                      textAlign: 'center',
                      background: 'rgba(0,0,0,0.5)',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}
                  >
                    {terminalObjects[1].v.toFixed(0)} m/s {terminalObjects[1].reached && '(Terminal!)'}
                  </div>
                </>
              )}

              {/* Start prompt outside SVG */}
              {!showTerminalSim && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: typo.bodyLarge,
                    color: colors.textMuted,
                    textAlign: 'center'
                  }}
                >
                  Click &quot;Jump&quot; to start
                </div>
              )}
            </div>

            <div className="bg-slate-800 p-4 rounded-xl max-w-lg mb-4">
              <p className="text-slate-300 text-sm">
                <span className="text-green-400 font-bold">Spread eagle:</span> Large area, high drag → lower terminal velocity (~55 m/s)
              </p>
              <p className="text-slate-300 text-sm mt-1">
                <span className="text-orange-400 font-bold">Tucked position:</span> Small area, low drag → higher terminal velocity (~70 m/s)
              </p>
            </div>

            <div className="flex gap-3 mb-4">
              <button
                onClick={startTerminalSim}
                disabled={showTerminalSim}
                style={{ zIndex: 10, position: 'relative' }}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white font-bold rounded-xl"
              >
                {showTerminalSim ? 'Falling...' : 'Jump!'}
              </button>
              <button
                onClick={resetTerminalSim}
                style={{ zIndex: 10, position: 'relative' }}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-xl"
              >
                Reset
              </button>
            </div>

            <button
              onClick={() => goToPhase('twist_review')}
              style={{ zIndex: 10, position: 'relative' }}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl"
            >
              Understand Terminal Velocity
            </button>
          </div>
        );

      // ========== TWIST REVIEW PHASE ==========
      case 'twist_review':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">Understanding Terminal Velocity</h2>

            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 p-6 rounded-xl max-w-lg mb-6 border border-purple-500/30">
              <h3 className="text-lg font-bold text-pink-400 mb-4 text-center">When Drag Equals Weight</h3>

              <div className="bg-slate-900 p-4 rounded-lg text-center mb-4">
                <p className="text-slate-300 mb-2">At terminal velocity:</p>
                <span className="text-xl font-mono text-yellow-400">F<sub>drag</sub> = Weight = mg</span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-2xl">1️⃣</span>
                  <p className="text-slate-300">Object starts falling, speeds up due to gravity</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-2xl">2️⃣</span>
                  <p className="text-slate-300">As speed increases, drag force grows (∝ v²)</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-2xl">3️⃣</span>
                  <p className="text-slate-300">Eventually drag = weight, net force = 0</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-2xl">4️⃣</span>
                  <p className="text-slate-300">Acceleration stops → constant velocity!</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-xl max-w-lg mb-6">
              <h4 className="font-bold text-cyan-400 mb-2">Terminal Velocity Formula</h4>
              <div className="bg-slate-900 p-3 rounded text-center mb-2">
                <span className="font-mono text-sky-400">v<sub>terminal</sub> = √(2mg / ρC<sub>d</sub>A)</span>
              </div>
              <p className="text-slate-400 text-sm">
                Heavier objects or smaller cross-sections = higher terminal velocity.
                That&apos;s why a bowling ball falls faster than a beach ball!
              </p>
            </div>

            <button
              onClick={() => goToPhase('transfer')}
              style={{ zIndex: 10, position: 'relative' }}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold rounded-xl"
            >
              See Real-World Applications
            </button>
          </div>
        );

      // ========== TRANSFER PHASE ==========
      case 'transfer':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-green-400 mb-6">Real-World Applications</h2>

            <div className="flex gap-2 mb-4 flex-wrap justify-center">
              {applications.map((app, index) => (
                <button
                  key={index}
                  onClick={() => setActiveAppTab(index)}
                  style={{ zIndex: 10, position: 'relative' }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeAppTab === index
                      ? `bg-gradient-to-r ${app.color} text-white`
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {completedApps.has(index) && '✓ '}{app.title}
                </button>
              ))}
            </div>

            <div className={`bg-gradient-to-r ${applications[activeAppTab].color} p-1 rounded-xl w-full max-w-md`}>
              <div className="bg-slate-900 p-4 rounded-lg">
                <div className="w-24 h-24 mx-auto mb-4">
                  {applications[activeAppTab].icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{applications[activeAppTab].title}</h3>
                <p className="text-slate-300">{applications[activeAppTab].description}</p>
                {!completedApps.has(activeAppTab) && (
                  <button
                    onClick={() => handleAppComplete(activeAppTab)}
                    style={{ zIndex: 10, position: 'relative' }}
                    className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg"
                  >
                    Mark as Understood
                  </button>
                )}
              </div>
            </div>

            <p className="text-slate-400 mt-4">
              Completed: {completedApps.size} / {applications.length}
            </p>

            {completedApps.size >= 3 && (
              <button
                onClick={() => goToPhase('test')}
                style={{ zIndex: 10, position: 'relative' }}
                className="mt-4 px-8 py-3 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-bold rounded-xl"
              >
                Take the Quiz
              </button>
            )}
          </div>
        );

      // ========== TEST PHASE ==========
      case 'test':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-sky-400 mb-6">Knowledge Check</h2>

            <div className="w-full max-w-lg space-y-4 max-h-[500px] overflow-y-auto">
              {questions.map((question, qIndex) => (
                <div key={qIndex} className="bg-slate-800 p-4 rounded-xl">
                  <p className="text-slate-200 mb-3 font-medium">{qIndex + 1}. {question.q}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {question.opts.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onClick={() => handleTestAnswer(qIndex, oIndex)}
                        disabled={showTestResults}
                        style={{ zIndex: 10, position: 'relative' }}
                        className={`p-2 rounded-lg text-sm text-left transition-all ${
                          showTestResults && option.correct
                            ? 'bg-green-600 text-white'
                            : showTestResults && testAnswers[qIndex] === oIndex && !option.correct
                            ? 'bg-red-600 text-white'
                            : testAnswers[qIndex] === oIndex
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        }`}
                      >
                        {option.text}
                      </button>
                    ))}
                  </div>
                  {showTestResults && (
                    <p className="text-slate-400 text-sm mt-2 italic">{question.exp}</p>
                  )}
                </div>
              ))}
            </div>

            {!showTestResults && testAnswers.every(a => a !== -1) && (
              <button
                onClick={handleSubmitTest}
                style={{ zIndex: 10, position: 'relative' }}
                className="mt-6 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl"
              >
                Submit Answers
              </button>
            )}

            {showTestResults && (
              <div className="mt-6 text-center">
                <p className="text-2xl font-bold text-sky-400">
                  Score: {testScore} / 10
                </p>
                <p className={`text-lg ${testScore >= 7 ? 'text-green-400' : 'text-orange-400'}`}>
                  {testScore >= 7 ? 'Excellent! You\'ve mastered drag force!' : 'Good effort! Review the material and try again.'}
                </p>
                {testScore >= 7 && (
                  <button
                    onClick={() => goToPhase('mastery')}
                    style={{ zIndex: 10, position: 'relative' }}
                    className="mt-4 px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold rounded-xl"
                  >
                    Claim Your Badge!
                  </button>
                )}
              </div>
            )}
          </div>
        );

      // ========== MASTERY PHASE ==========
      case 'mastery':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
            <div className="text-6xl mb-4">🪂</div>
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400 mb-4">
              Drag Force Master!
            </h2>
            <div className="bg-gradient-to-r from-sky-600/20 to-cyan-600/20 border border-sky-500/50 p-6 rounded-xl max-w-md mb-6">
              <p className="text-slate-200 mb-4">
                Congratulations! You&apos;ve mastered the physics of drag force and air resistance!
              </p>
              <div className="text-left text-sm text-slate-300 space-y-2">
                <p>✓ Drag equation: F = ½ρv²CdA</p>
                <p>✓ Velocity squared effect on drag</p>
                <p>✓ Terminal velocity concept</p>
                <p>✓ Real-world aerodynamic applications</p>
              </div>
            </div>
            <p className="text-cyan-400 font-medium mb-6">
              Now you understand why skydivers can control their speed and why cars are designed to be streamlined!
            </p>
            <button
              onClick={() => goToPhase('hook')}
              style={{ zIndex: 10, position: 'relative' }}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl"
            >
              Start Over
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-600/3 rounded-full blur-3xl" />

      {/* Premium progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-sky-400">Drag Force</span>
          <div className="flex gap-1.5">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10, position: 'relative' }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-gradient-to-r from-sky-400 to-cyan-400 w-6 shadow-lg shadow-sky-500/50'
                    : phaseOrder.indexOf(phase) > i
                    ? 'bg-emerald-500 w-2'
                    : 'bg-slate-600 w-2 hover:bg-slate-500'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm text-slate-400 font-medium">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 pt-16 pb-8">
        {renderPhaseContent()}
      </div>
    </div>
  );
};

export default DragForceRenderer;
