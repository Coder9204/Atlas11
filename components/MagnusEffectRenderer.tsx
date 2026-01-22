import React, { useState, useEffect, useCallback, useRef } from 'react';

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

// Numeric phases: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Lab', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Lab', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
};

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

const MagnusEffectRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
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

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with external phase control
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

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

  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
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
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'correct' : 'incorrect');
  }, [playSound]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  }, []);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
  }, [playSound]);

  const startAnimation = useCallback(() => {
    setBallX(50);
    setBallY(150);
    setTrajectory([]);
    setIsAnimating(true);
  }, []);

  const testQuestions = [
    {
      question: "What causes the Magnus effect?",
      options: ["Gravity acting on spin", "Pressure difference from air speed variation", "Magnetic forces", "Wind resistance only"],
      correct: 1
    },
    {
      question: "A ball with topspin will curve:",
      options: ["Upward", "Downward", "Left only", "It won't curve"],
      correct: 1
    },
    {
      question: "On which side of a spinning ball is air pressure lower?",
      options: ["The side spinning into the airflow", "The side spinning with the airflow", "Both sides equal", "Pressure doesn't change"],
      correct: 1
    },
    {
      question: "The Magnus force is perpendicular to:",
      options: ["Gravity only", "Both velocity and spin axis", "The ground", "Nothing - it acts in all directions"],
      correct: 1
    },
    {
      question: "Why do golf balls have dimples?",
      options: ["Decoration only", "To increase drag", "To enhance the Magnus effect and reduce drag", "To make them heavier"],
      correct: 2
    },
    {
      question: "A curveball in baseball uses:",
      options: ["Only gravity", "The Magnus effect from spin", "Air temperature changes", "The weight of the ball"],
      correct: 1
    },
    {
      question: "Increasing spin rate will:",
      options: ["Decrease the curve", "Have no effect", "Increase the curve", "Make the ball go straight"],
      correct: 2
    },
    {
      question: "The Magnus force equation F = CL × ½ρv²A shows force depends on:",
      options: ["Only ball size", "Velocity squared", "Temperature only", "Color of ball"],
      correct: 1
    },
    {
      question: "Backspin on a tennis ball causes it to:",
      options: ["Drop faster", "Stay in the air longer", "Curve left", "Stop spinning"],
      correct: 1
    },
    {
      question: "The Magnus effect also works:",
      options: ["Only in air", "Only in water", "In any fluid (air, water, etc.)", "Only in a vacuum"],
      correct: 2
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (answer === testQuestions[index].correct ? 1 : 0);
    }, 0);
  };

  const renderSpinningBall = (size: number = 60, showAirflow: boolean = false) => {
    return (
      <svg width="400" height="320" className="mx-auto">
        <defs>
          <linearGradient id="skyGradMagnus" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#0c1929" />
          </linearGradient>
          <radialGradient id="ballGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#dc2626" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width="400" height="320" fill="url(#skyGradMagnus)" rx="12" />

        {/* Trajectory trail */}
        {trajectory.length > 1 && (
          <path
            d={`M ${trajectory.map((p, i) => `${p.x} ${p.y}`).join(' L ')}`}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.6"
          />
        )}

        {/* Airflow lines when showing */}
        {showAirflow && (
          <g>
            {/* Top airflow - faster */}
            <path d="M80,120 Q200,100 350,120" fill="none" stroke="#3b82f6" strokeWidth="2" opacity="0.7">
              <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.5s" repeatCount="indefinite" />
            </path>
            <text x="200" y="95" textAnchor="middle" fill="#3b82f6" fontSize="11">Fast air = Low pressure</text>

            {/* Bottom airflow - slower */}
            <path d="M80,180 Q200,200 350,180" fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.7" strokeDasharray="8,4">
              <animate attributeName="stroke-dashoffset" from="0" to="12" dur="1s" repeatCount="indefinite" />
            </path>
            <text x="200" y="220" textAnchor="middle" fill="#ef4444" fontSize="11">Slow air = High pressure</text>

            {/* Magnus force arrow */}
            <line x1="200" y1="180" x2="200" y2="130" stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrowMagnus)" />
            <text x="230" y="155" fill="#22c55e" fontSize="12" fontWeight="bold">Magnus Force</text>
          </g>
        )}

        {/* Ball */}
        <g transform={`translate(${ballX}, ${ballY})`}>
          <circle r={size/2} fill="url(#ballGrad)" stroke="#991b1b" strokeWidth="2" />
          {/* Seam lines to show rotation */}
          <g transform={`rotate(${ballRotation})`}>
            <path d={`M-${size/3},0 Q0,-${size/3} ${size/3},0 Q0,${size/3} -${size/3},0`}
                  fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.8" />
          </g>
          {/* Spin direction indicator */}
          {spinDirection === 'topspin' && (
            <path d={`M-15,-${size/2+10} A20,20 0 0 1 15,-${size/2+10}`} fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowSpin)" />
          )}
          {spinDirection === 'backspin' && (
            <path d={`M15,-${size/2+10} A20,20 0 0 0 -15,-${size/2+10}`} fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowSpin)" />
          )}
        </g>

        {/* Ground/target */}
        <rect x="360" y="100" width="30" height="180" fill="#4ade80" opacity="0.3" rx="4" />
        <text x="375" y="195" textAnchor="middle" fill="#4ade80" fontSize="10">Target</text>

        {/* Markers */}
        <defs>
          <marker id="arrowMagnus" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#22c55e" />
          </marker>
          <marker id="arrowSpin" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L7,3 z" fill="#fbbf24" />
          </marker>
        </defs>
      </svg>
    );
  };

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
        How does spinning make a ball curve?
      </p>

      {/* Premium card */}
      <div className="w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        {renderSpinningBall(50, false)}
        <p className="text-gray-300 text-center leading-relaxed mt-4 mb-4">
          A pitcher throws a baseball with heavy spin. Instead of going straight, it curves dramatically!
        </p>
        <button
          onMouseDown={(e) => { e.preventDefault(); startAnimation(); }}
          className="w-full px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-white font-medium rounded-xl transition-colors border border-white/10"
        >
          Throw Curveball
        </button>
      </div>

      {/* CTA Button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="group px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 flex items-center gap-2"
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
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
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
            Correct! The spinning ball creates <span className="text-cyan-400">pressure differences</span> in the surrounding air!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

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
            onChange={(e) => setSpinRate(Number(e.target.value))}
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
            onChange={(e) => setBallSpeed(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="md:col-span-2 flex gap-2 justify-center">
          {(['topspin', 'backspin', 'sidespin'] as const).map(type => (
            <button
              key={type}
              onMouseDown={(e) => { e.preventDefault(); setSpinDirection(type); }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                spinDirection === type ? 'bg-red-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        <div className="md:col-span-2">
          <button
            onMouseDown={(e) => { e.preventDefault(); startAnimation(); }}
            className="w-full p-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
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
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
      >
        Review the Concepts
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding the Magnus Effect</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-red-400 mb-3">The Physics</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Spinning ball creates asymmetric airflow</li>
            <li>• One side: ball surface moves WITH airflow (adds speed)</li>
            <li>• Other side: ball surface moves AGAINST airflow (subtracts speed)</li>
            <li>• Fast air = low pressure, slow air = high pressure</li>
            <li>• Ball pushed from high to low pressure side!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">The Math</h3>
          <div className="space-y-2 text-slate-300 text-sm">
            <p className="font-mono bg-slate-800/50 p-2 rounded">F = CL × ½ρv²A</p>
            <ul className="mt-2 space-y-1">
              <li>• F = Magnus force</li>
              <li>• CL = Lift coefficient (depends on spin)</li>
              <li>• ρ = Air density</li>
              <li>• v = Ball velocity</li>
              <li>• A = Cross-sectional area</li>
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
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
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
          Smooth balls curve predictably with the Magnus effect. But what about a ball spinning VERY fast at VERY high speeds?
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          At extreme conditions, what happens to the curve?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The curve gets even stronger' },
          { id: 'B', text: 'The ball goes perfectly straight' },
          { id: 'C', text: 'The curve can actually REVERSE direction!' },
          { id: 'D', text: 'The ball explodes from air friction' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
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
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            See How
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">Reverse Magnus Effect</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-3xl">
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2 text-center">Normal Magnus</h3>
          <svg width="180" height="120" className="mx-auto">
            <rect width="180" height="120" fill="#1e3a5f" rx="8" />
            <circle cx="50" cy="60" r="20" fill="#dc2626" />
            <path d="M30,45 A25,25 0 0 1 70,45" fill="none" stroke="#fbbf24" strokeWidth="2" />
            <path d="M70,60 Q120,40 160,60" fill="none" stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrNorm)" />
            <text x="115" y="35" fill="#22c55e" fontSize="10">Curves up</text>
            <text x="90" y="100" fill="#94a3b8" fontSize="9">Smooth ball, normal speed</text>
            <defs>
              <marker id="arrNorm" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill="#22c55e" />
              </marker>
            </defs>
          </svg>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-purple-400 mb-2 text-center">Reverse Magnus</h3>
          <svg width="180" height="120" className="mx-auto">
            <rect width="180" height="120" fill="#1e3a5f" rx="8" />
            <circle cx="50" cy="60" r="20" fill="#dc2626" />
            {/* Very fast spin indicator */}
            <path d="M30,45 A25,25 0 0 1 70,45" fill="none" stroke="#fbbf24" strokeWidth="3" />
            <path d="M35,50 A20,20 0 0 1 65,50" fill="none" stroke="#fbbf24" strokeWidth="2" />
            <path d="M70,60 Q120,80 160,60" fill="none" stroke="#a855f7" strokeWidth="3" markerEnd="url(#arrRev)" />
            <text x="115" y="90" fill="#a855f7" fontSize="10">Curves DOWN!</text>
            <text x="90" y="110" fill="#94a3b8" fontSize="9">Extreme spin & speed</text>
            <defs>
              <marker id="arrRev" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill="#a855f7" />
              </marker>
            </defs>
          </svg>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-purple-400 mb-3">Why Does It Reverse?</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• At extreme speeds, the boundary layer transitions from laminar to turbulent</li>
          <li>• Turbulent flow separates from the ball at different points than laminar flow</li>
          <li>• This changes which side has higher/lower pressure</li>
          <li>• The result: the ball curves the OPPOSITE direction!</li>
          <li>• This is called the "negative Magnus effect" or "reverse Magnus"</li>
        </ul>
        <p className="text-cyan-400 mt-4 text-sm">
          This effect has been observed in volleyball serves and some extreme baseball pitches!
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Review the Discovery
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">Key Discovery</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">The Magnus Effect Has Hidden Complexity!</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            The Magnus effect isn't a simple linear relationship. Depending on:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Ball surface texture (smooth vs dimpled vs rough)</li>
            <li>Spin rate relative to forward velocity</li>
            <li>Reynolds number (fluid dynamics parameter)</li>
            <li>Air density and viscosity</li>
          </ol>
          <p className="text-emerald-400 font-medium mt-4">
            The curve can be normal, enhanced, reduced, or even reversed!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            This is why golf balls have dimples - they create a controlled turbulent boundary layer that actually ENHANCES the Magnus effect while reducing overall drag!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  const applications = [
    {
      title: "Baseball Pitching",
      icon: "⚾",
      description: "Curveballs, sliders, and cutters all use the Magnus effect to fool batters.",
      details: "A curveball can drop up to 17 inches from its expected path. Pitchers grip the ball to maximize spin, creating dramatic movement that makes hitting extremely difficult.",
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
      title: "Soccer Free Kicks",
      icon: "⚽",
      description: "The 'banana kick' curves around defensive walls using sidespin.",
      details: "Players like Roberto Carlos and David Beckham mastered kicks that curve dramatically. The ball can bend over 10 feet from a straight line, going around walls and into the goal.",
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
      title: "Golf Drives",
      icon: "⛳",
      description: "Backspin keeps the ball airborne longer, dramatically increasing distance.",
      details: "A well-struck drive has 2,500-3,000 RPM of backspin. The Magnus effect creates lift that keeps the ball in the air 2-3 times longer than a non-spinning ball would fly.",
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
      title: "Table Tennis",
      icon: "🏓",
      description: "Heavy topspin makes the ball dip sharply, keeping aggressive shots on the table.",
      details: "Professional players generate over 9,000 RPM of spin! The Magnus effect makes the ball curve so sharply that seemingly impossible shots stay in play, and returns become unpredictable.",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          <rect width="200" height="150" fill="#1e3a5f" rx="8" />
          {/* Table */}
          <rect x="20" y="80" width="160" height="10" fill="#006400" stroke="#ffffff" strokeWidth="1" />
          {/* Net */}
          <rect x="98" y="60" width="4" height="25" fill="#ffffff" />
          {/* Ball with heavy topspin - dips sharply */}
          <path d="M40,50 Q100,30 160,85" fill="none" stroke="#fbbf24" strokeWidth="3" />
          <circle cx="40" cy="50" r="5" fill="#ff6600" />
          <circle cx="160" cy="85" r="5" fill="#ff6600" />
          {/* Spin arrow */}
          <path d="M35,40 A10,10 0 0 1 45,40" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#spinArr)" />
          <text x="100" y="130" textAnchor="middle" fill="#94a3b8" fontSize="10">Topspin makes ball dip</text>
          <defs>
            <marker id="spinArr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
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
            onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index
                ? 'bg-red-600 text-white'
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {app.title.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{applications[activeAppTab].icon}</span>
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
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
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
          onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
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
                    onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onMouseDown={(e) => { e.preventDefault(); setShowTestResults(true); }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
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
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Score: {calculateScore()}/10
          </h3>
          <p className="text-slate-300 mb-6">
            {calculateScore() >= 7
              ? 'Excellent! You\'ve mastered the Magnus effect!'
              : 'Keep studying! Review the concepts and try again.'}
          </p>

          {calculateScore() >= 7 ? (
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase(3); }}
              className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
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
      <div className="bg-gradient-to-br from-red-900/50 via-orange-900/50 to-yellow-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">⚾</div>
        <h1 className="text-3xl font-bold text-white mb-4">Magnus Effect Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the physics of spinning balls and curved trajectories!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🌀</div>
            <p className="text-sm text-slate-300">Spin Physics</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">💨</div>
            <p className="text-sm text-slate-300">Pressure Dynamics</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⚾</div>
            <p className="text-sm text-slate-300">Sports Applications</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔄</div>
            <p className="text-sm text-slate-300">Reverse Magnus</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(0); }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            Explore Again
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
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  p <= phase
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
