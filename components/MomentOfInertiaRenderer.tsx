import React, { useState, useEffect, useCallback, useRef } from 'react';

// Phase is now numeric 0-9 for consistency with gold standard
// 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'simulation_stopped'
  | 'parameter_changed'
  | 'arm_position_changed'
  | 'spin_toggled'
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
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

const MomentOfInertiaRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
  // Phase constants
  const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const phaseLabels: Record<number, string> = {
    0: 'Hook',
    1: 'Predict',
    2: 'Lab',
    3: 'Review',
    4: 'Twist',
    5: 'Demo',
    6: 'Discovery',
    7: 'Apply',
    8: 'Test',
    9: 'Mastery'
  };

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

  // Animation states
  const [rotation, setRotation] = useState(0);
  const [armExtension, setArmExtension] = useState(1); // 0 = tucked, 1 = extended
  const [angularVelocity, setAngularVelocity] = useState(3); // base spin rate
  const [isSpinning, setIsSpinning] = useState(true);
  const [initialL, setInitialL] = useState(15); // constant angular momentum

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sound utility with Web Audio API
  const playSound = useCallback((type: 'click' | 'correct' | 'incorrect' | 'complete' | 'transition' | 'spin') => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
        click: { freq: 600, duration: 0.1, type: 'sine' },
        correct: { freq: 800, duration: 0.2, type: 'sine' },
        incorrect: { freq: 300, duration: 0.3, type: 'sawtooth' },
        complete: { freq: 1000, duration: 0.3, type: 'sine' },
        transition: { freq: 500, duration: 0.15, type: 'triangle' },
        spin: { freq: 200, duration: 0.1, type: 'sine' }
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
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  const goToPhase = useCallback((newPhase: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    if (navigationLockRef.current) return;
    lastClickRef.current = now;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseName: phaseLabels[newPhase] } });
    onPhaseComplete?.(newPhase);
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent, onPhaseComplete, phaseLabels]);

  // Calculate effective angular velocity based on arm position
  // L = I * ω is constant, so ω = L / I
  // When arms are tucked (extension=0), I is smaller, so ω is larger
  const calculateOmega = useCallback((extension: number) => {
    // I = I_body + m*r^2 for arms
    // Simplified: I scales from 1 (tucked) to 3 (extended)
    const momentOfInertia = 1 + 2 * extension;
    return initialL / momentOfInertia;
  }, [initialL]);

  // Skater animation
  useEffect(() => {
    if (!isSpinning) return;

    const interval = setInterval(() => {
      const omega = calculateOmega(armExtension);
      setAngularVelocity(omega);
      setRotation(prev => (prev + omega * 2) % 360);
    }, 50);

    return () => clearInterval(interval);
  }, [isSpinning, armExtension, calculateOmega]);

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
    playSound(prediction === 'A' ? 'correct' : 'incorrect');
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

  const testQuestions = [
    {
      question: "What quantity is conserved when an ice skater pulls in their arms?",
      options: ["Angular velocity", "Angular momentum", "Rotational energy", "Moment of inertia"],
      correct: 1
    },
    {
      question: "When a skater pulls in their arms, their moment of inertia:",
      options: ["Increases", "Decreases", "Stays the same", "Becomes zero"],
      correct: 1
    },
    {
      question: "The moment of inertia depends on:",
      options: ["Only the total mass", "Mass distribution relative to the rotation axis", "Only the rotation speed", "The temperature"],
      correct: 1
    },
    {
      question: "Angular momentum L is calculated as:",
      options: ["L = mv", "L = Iω", "L = ½Iω²", "L = mgh"],
      correct: 1
    },
    {
      question: "A diver in the tuck position spins faster because:",
      options: ["They have more energy", "Their moment of inertia is smaller", "Gravity pulls them faster", "Air resistance is lower"],
      correct: 1
    },
    {
      question: "When a neutron star collapses and shrinks, its spin rate:",
      options: ["Decreases dramatically", "Increases dramatically", "Stays exactly the same", "Becomes zero"],
      correct: 1
    },
    {
      question: "Which shape has the largest moment of inertia for the same mass?",
      options: ["Solid sphere", "Hollow sphere", "Point mass at center", "All have the same I"],
      correct: 1
    },
    {
      question: "If you double the distance of a mass from the rotation axis, its contribution to I:",
      options: ["Doubles", "Quadruples", "Halves", "Stays the same"],
      correct: 1
    },
    {
      question: "When an ice skater extends their arms, their kinetic energy:",
      options: ["Increases", "Decreases", "Stays constant", "Becomes negative"],
      correct: 1
    },
    {
      question: "The equation I = mr² shows that moment of inertia depends on distance:",
      options: ["Linearly", "Quadratically (squared)", "Cubically", "Exponentially"],
      correct: 1
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (answer === testQuestions[index].correct ? 1 : 0);
    }, 0);
  };

  const renderSkater = (extension: number, rot: number, size: number = 200) => {
    const centerX = size / 2;
    const centerY = size / 2 + 20;
    const armLength = 25 + extension * 40; // Arm length based on extension
    const armAngle = 70 - extension * 60; // Angle from vertical

    return (
      <svg width={size} height={size + 40} className="overflow-visible">
        {/* Ice surface */}
        <ellipse cx={centerX} cy={size + 20} rx={80} ry={15} fill="url(#iceGradient)" opacity="0.5" />

        {/* Rotation indicator */}
        <g transform={`translate(${centerX}, ${centerY})`}>
          {/* Rotation trail */}
          <ellipse cx="0" cy="60" rx="50" ry="12" fill="none" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="2" strokeDasharray="8 4" />

          {/* Speed indicators */}
          {[0, 60, 120, 180, 240, 300].map((angle, i) => {
            const r = 45;
            const intensity = Math.min(1, angularVelocity / 10);
            return (
              <circle
                key={i}
                cx={Math.cos((angle + rot) * Math.PI / 180) * r}
                cy={60 + Math.sin((angle + rot) * Math.PI / 180) * 12}
                r={2 + intensity * 2}
                fill={`rgba(99, 102, 241, ${0.3 + intensity * 0.5})`}
              />
            );
          })}
        </g>

        {/* Skater body */}
        <g transform={`translate(${centerX}, ${centerY}) rotate(${rot * 0.5})`}>
          {/* Head */}
          <circle cx="0" cy="-55" r="15" fill="#fcd9b6" stroke="#e0b090" strokeWidth="2" />
          <circle cx="-4" cy="-58" r="2" fill="#333" />
          <circle cx="4" cy="-58" r="2" fill="#333" />
          <ellipse cx="0" cy="-52" rx="3" ry="1.5" fill="#e88" />

          {/* Hair */}
          <path d="M-12,-62 Q-15,-75 0,-72 Q15,-75 12,-62" fill="#8B4513" />

          {/* Torso */}
          <path d="M-15,-40 L-12,-10 L12,-10 L15,-40 Z" fill="url(#dressGradient)" />

          {/* Skirt */}
          <path d={`M-15,-10 Q-25,10 -30,40 L30,40 Q25,10 15,-10 Z`} fill="url(#skirtGradient)" />

          {/* Arms */}
          <g transform={`rotate(${-armAngle})`}>
            <rect x="-50" y="-5" width={armLength} height="8" rx="4" fill="#fcd9b6" />
            <circle cx={-armLength + 5} cy="0" r="6" fill="#fcd9b6" />
          </g>
          <g transform={`rotate(${armAngle})`}>
            <rect x={50 - armLength} y="-5" width={armLength} height="8" rx="4" fill="#fcd9b6" />
            <circle cx={armLength - 5} cy="0" r="6" fill="#fcd9b6" />
          </g>

          {/* Legs */}
          <rect x="-8" y="35" width="6" height="35" fill="#fcd9b6" />
          <rect x="2" y="35" width="6" height="35" fill="#fcd9b6" />

          {/* Skates */}
          <rect x="-12" y="68" width="14" height="6" rx="2" fill="#f8f8f8" />
          <rect x="-2" y="68" width="14" height="6" rx="2" fill="#f8f8f8" />
          <rect x="-12" y="73" width="16" height="2" fill="#c0c0c0" />
          <rect x="-2" y="73" width="16" height="2" fill="#c0c0c0" />
        </g>

        <defs>
          <linearGradient id="iceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#a5f3fc" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="dressGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#be185d" />
          </linearGradient>
          <linearGradient id="skirtGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-8 px-6">
      {/* Premium badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
        <span className="text-pink-400/80 text-sm font-medium tracking-wide uppercase">Rotational Mechanics</span>
      </div>

      {/* Gradient title */}
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-3 bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
        The Spinning Skater Mystery
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg md:text-xl text-center mb-8 max-w-lg">
        How does moving arms change spin speed?
      </p>

      {/* Premium card */}
      <div className="w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        <div className="flex justify-center">
          {renderSkater(0.3, rotation, 180)}
        </div>
        <p className="text-gray-300 text-center leading-relaxed mt-4">
          Watch an ice skater begin a slow spin, then suddenly pull in their arms and spin incredibly fast!
        </p>
      </div>

      {/* CTA Button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="group px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 flex items-center gap-2"
      >
        Discover the Secret
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      {/* Hint text */}
      <p className="text-slate-500 text-sm mt-6">
        Learn about conservation of angular momentum
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A spinning skater pulls their arms in close to their body. What happens to their spin speed?
        </p>
        <div className="flex justify-center gap-4">
          {renderSkater(1, 0, 120)}
          <div className="flex items-center text-2xl text-cyan-400">→</div>
          {renderSkater(0, 0, 120)}
        </div>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Spin speed stays the same' },
          { id: 'B', text: 'Spin speed increases significantly' },
          { id: 'C', text: 'Spin speed decreases' },
          { id: 'D', text: 'The skater stops spinning' }
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
            ✓ Correct! This happens because of <span className="text-cyan-400">conservation of angular momentum</span>!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
          >
            Explore the Physics →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => {
    const momentOfInertia = 1 + 2 * armExtension;
    const currentOmega = calculateOmega(armExtension);

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Interactive Spin Lab</h2>
        <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
          {renderSkater(armExtension, rotation, 220)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
          <div className="bg-slate-700/50 rounded-xl p-4">
            <label className="text-slate-300 text-sm block mb-2">Arm Position: {armExtension < 0.3 ? 'Tucked' : armExtension > 0.7 ? 'Extended' : 'Partial'}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={armExtension}
              onChange={(e) => setArmExtension(parseFloat(e.target.value))}
              className="w-full accent-pink-500"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Tucked</span>
              <span>Extended</span>
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-xl p-4">
            <label className="text-slate-300 text-sm block mb-2">Angular Momentum L = {initialL.toFixed(0)}</label>
            <input
              type="range"
              min="5"
              max="25"
              value={initialL}
              onChange={(e) => setInitialL(parseFloat(e.target.value))}
              className="w-full accent-pink-500"
            />
            <p className="text-xs text-slate-400 mt-1">L stays constant (conserved)</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-pink-900/40 to-purple-900/40 rounded-xl p-4 max-w-2xl w-full mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-pink-400">{momentOfInertia.toFixed(2)}</div>
              <div className="text-sm text-slate-300">Moment of Inertia (I)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-cyan-400">{currentOmega.toFixed(2)}</div>
              <div className="text-sm text-slate-300">Angular Velocity (ω)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{initialL.toFixed(0)}</div>
              <div className="text-sm text-slate-300">L = Iω (constant!)</div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onMouseDown={(e) => { e.preventDefault(); setIsSpinning(!isSpinning); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isSpinning ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
            } text-white`}
          >
            {isSpinning ? '⏸ Pause' : '▶ Play'}
          </button>
        </div>

        <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2">Key Insight:</h3>
          <p className="text-slate-300 text-sm">
            <span className="text-pink-400 font-semibold">L = Iω</span> is constant. When you decrease <span className="text-pink-400">I</span> by pulling in arms, <span className="text-cyan-400">ω</span> must increase to keep L the same!
          </p>
        </div>

        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
        >
          Review the Concepts →
        </button>
      </div>
    );
  };

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Moment of Inertia</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-pink-900/50 to-purple-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-pink-400 mb-3">⚖️ Moment of Inertia</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Resistance to changes in rotation (rotational "mass")</li>
            <li>• For a point mass: <span className="text-cyan-400 font-mono">I = mr²</span></li>
            <li>• Depends on mass AND distance from axis</li>
            <li>• Distance is squared—doubling r quadruples I!</li>
            <li>• Objects with mass far from axis have larger I</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">🔄 Angular Momentum</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• <span className="text-pink-400 font-mono">L = Iω</span> (moment of inertia × angular velocity)</li>
            <li>• Conserved when no external torque acts</li>
            <li>• When I decreases, ω must increase</li>
            <li>• When I increases, ω must decrease</li>
            <li>• This is why skaters speed up with tucked arms!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">🧮 The Math</h3>
          <div className="text-slate-300 text-sm space-y-2">
            <p><strong>Initial State:</strong> L₁ = I₁ω₁ (arms extended)</p>
            <p><strong>Final State:</strong> L₂ = I₂ω₂ (arms tucked)</p>
            <p><strong>Conservation:</strong> L₁ = L₂, so I₁ω₁ = I₂ω₂</p>
            <p className="text-cyan-400 mt-3">
              If I₂ = I₁/3 (arms tucked), then ω₂ = 3ω₁ — the skater spins 3x faster!
            </p>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
      >
        Discover a Surprising Twist →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">🌟 The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A spinning skater is holding two heavy weights at arm's length. While spinning, they let go of the weights, which fly away.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What happens to the skater's spin speed immediately after releasing the weights?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The skater\'s spin speed stays the same' },
          { id: 'B', text: 'The skater speeds up (like tucking arms)' },
          { id: 'C', text: 'The skater slows down' },
          { id: 'D', text: 'The skater stops spinning completely' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'A'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'A'
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
            ✓ Surprising! The spin speed stays the same!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            The weights carry away their share of angular momentum when released. The skater keeps only their own L.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
          >
            See Why →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Releasing vs. Pulling In</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-3xl">
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-pink-400 mb-2 text-center">Pull Arms In</h3>
          <svg width="180" height="150" className="mx-auto">
            {/* Skater gets faster */}
            <circle cx="90" cy="75" r="30" fill="url(#dressGradient)" />
            <circle cx="90" cy="45" r="12" fill="#fcd9b6" />
            {/* Spin arrows */}
            <path d="M130,75 A40,40 0 0 1 90,115" fill="none" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrowGreen2)" />
            <text x="140" y="80" fill="#10b981" fontSize="14" fontWeight="bold">ω↑</text>
            <text x="90" y="140" textAnchor="middle" fill="#94a3b8" fontSize="11">Mass stays with skater</text>
          </svg>
          <p className="text-sm text-slate-300 mt-2 text-center">
            L stays constant → ω increases
          </p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-amber-400 mb-2 text-center">Release Weights</h3>
          <svg width="180" height="150" className="mx-auto">
            {/* Skater same speed */}
            <circle cx="90" cy="75" r="30" fill="url(#dressGradient)" />
            <circle cx="90" cy="45" r="12" fill="#fcd9b6" />
            {/* Flying weights */}
            <circle cx="40" cy="60" r="8" fill="#64748b" />
            <circle cx="140" cy="90" r="8" fill="#64748b" />
            <path d="M48,58 L30,50" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowRed2)" />
            <path d="M132,92 L150,100" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowRed2)" />
            {/* Spin arrow same size */}
            <path d="M130,75 A40,40 0 0 1 90,115" fill="none" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#arrowOrange2)" />
            <text x="140" y="80" fill="#f59e0b" fontSize="14" fontWeight="bold">ω=</text>
            <text x="90" y="140" textAnchor="middle" fill="#94a3b8" fontSize="11">Weights take L with them</text>
          </svg>
          <p className="text-sm text-slate-300 mt-2 text-center">
            L splits between skater & weights
          </p>
        </div>
        <defs>
          <marker id="arrowGreen2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#10b981" />
          </marker>
          <marker id="arrowOrange2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#f59e0b" />
          </marker>
          <marker id="arrowRed2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
          </marker>
        </defs>
      </div>

      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-amber-400 mb-3">The Key Difference:</h3>
        <div className="space-y-3 text-slate-300 text-sm">
          <p>
            <span className="text-pink-400 font-semibold">Pulling in arms:</span> The mass stays part of the system. Total L is conserved within the skater, so ω must increase.
          </p>
          <p>
            <span className="text-amber-400 font-semibold">Releasing weights:</span> The weights carry away angular momentum L = Iω. The skater keeps their remaining L, so ω doesn't change!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
      >
        Review the Discovery →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">🌟 Key Discovery</h2>

      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-amber-400 mb-4">System Boundaries Matter!</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            Angular momentum is conserved for the <span className="text-cyan-400 font-semibold">entire system</span>. When you define what's in your system, that determines what happens:
          </p>
          <ul className="space-y-2 text-sm">
            <li>• <span className="text-pink-400">Closed system</span> (arms pulled in): All L stays with skater → ω increases</li>
            <li>• <span className="text-amber-400">Open system</span> (weights released): L is shared → each part keeps its own L</li>
          </ul>
          <p className="text-emerald-400 font-medium mt-4">
            This principle explains why rockets work in space—they "release" exhaust which carries momentum away!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
      >
        Explore Real-World Applications →
      </button>
    </div>
  );

  const applications = [
    {
      title: "Figure Skating",
      icon: "⛸️",
      description: "Skaters control spin speed by adjusting body position. Tucked positions enable spins over 300 RPM!",
      details: "The scratch spin starts with arms extended, building angular momentum. As the skater pulls into a tight position, their moment of inertia can decrease by a factor of 3-4, tripling their spin rate.",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          {/* Ice */}
          <ellipse cx="100" cy="140" rx="80" ry="10" fill="#a5f3fc" opacity="0.3" />
          {/* Three stages of spin */}
          <g transform="translate(30, 70)">
            <circle cx="0" cy="0" r="15" fill="#ec4899" />
            <line x1="-25" y1="0" x2="25" y2="0" stroke="#fcd9b6" strokeWidth="4" />
            <text x="0" y="35" textAnchor="middle" fill="#94a3b8" fontSize="9">Slow</text>
          </g>
          <text x="68" y="75" fill="#64748b" fontSize="20">→</text>
          <g transform="translate(100, 70)">
            <circle cx="0" cy="0" r="15" fill="#ec4899" />
            <line x1="-15" y1="0" x2="15" y2="0" stroke="#fcd9b6" strokeWidth="4" />
            <text x="0" y="35" textAnchor="middle" fill="#94a3b8" fontSize="9">Medium</text>
          </g>
          <text x="138" y="75" fill="#64748b" fontSize="20">→</text>
          <g transform="translate(170, 70)">
            <circle cx="0" cy="0" r="15" fill="#ec4899" />
            <circle cx="0" cy="0" r="3" fill="#fcd9b6" />
            <text x="0" y="35" textAnchor="middle" fill="#94a3b8" fontSize="9">Fast!</text>
          </g>
        </svg>
      )
    },
    {
      title: "Platform Diving",
      icon: "🏊",
      description: "Divers use tuck and pike positions to control rotation speed during complex maneuvers.",
      details: "A diver in layout position (body straight) rotates slowly. Pulling into a tight tuck reduces I by about 3.5x, allowing rapid somersaults. They then extend to slow rotation for a clean entry.",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          {/* Platform */}
          <rect x="10" y="20" width="40" height="8" fill="#64748b" />
          {/* Water */}
          <rect x="0" y="130" width="200" height="20" fill="#3b82f6" opacity="0.5" />
          {/* Diver stages */}
          <g transform="translate(35, 50)">
            <ellipse cx="0" cy="0" rx="5" ry="12" fill="#fcd9b6" />
          </g>
          <g transform="translate(80, 65) rotate(45)">
            <circle cx="0" cy="0" r="10" fill="#fcd9b6" />
          </g>
          <g transform="translate(125, 90) rotate(90)">
            <circle cx="0" cy="0" r="10" fill="#fcd9b6" />
          </g>
          <g transform="translate(165, 110)">
            <ellipse cx="0" cy="0" rx="5" ry="12" fill="#fcd9b6" />
          </g>
          {/* Rotation arrows */}
          <path d="M70,50 Q90,40 100,60" fill="none" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowGreen)" />
        </svg>
      )
    },
    {
      title: "Neutron Stars",
      icon: "⭐",
      description: "When a massive star collapses, conservation of angular momentum causes extreme spin-up.",
      details: "A star like our Sun rotates once per month. When its core collapses to a neutron star (radius shrinks by 50,000x), the spin rate can reach 700+ rotations per second!",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          {/* Star background */}
          {[1,2,3,4,5,6,7,8].map(i => (
            <circle key={i} cx={15 + (i * 23)} cy={10 + (i % 4) * 15} r="1" fill="white" opacity="0.5" />
          ))}
          {/* Before - large star */}
          <g transform="translate(50, 75)">
            <circle cx="0" cy="0" r="35" fill="#fbbf24" opacity="0.8" />
            <path d="M40,0 A40,40 0 0 1 0,40" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" />
            <text x="0" y="55" textAnchor="middle" fill="#94a3b8" fontSize="9">Slow spin</text>
          </g>
          {/* Arrow */}
          <text x="100" y="80" fill="#64748b" fontSize="20">→</text>
          {/* After - neutron star */}
          <g transform="translate(150, 75)">
            <circle cx="0" cy="0" r="10" fill="#60a5fa" />
            <ellipse cx="0" cy="0" rx="25" ry="6" fill="none" stroke="#3b82f6" strokeWidth="2" />
            {[0,1,2,3].map(i => (
              <circle key={i} cx={Math.cos(i * Math.PI/2 + rotation * 0.1) * 20} cy={Math.sin(i * Math.PI/2 + rotation * 0.1) * 5} r="2" fill="#93c5fd" />
            ))}
            <text x="0" y="40" textAnchor="middle" fill="#94a3b8" fontSize="9">700 Hz!</text>
          </g>
        </svg>
      )
    },
    {
      title: "Gyroscope Stabilization",
      icon: "🔧",
      description: "Heavy flywheels in ships and spacecraft use their large moment of inertia for stability.",
      details: "Control Moment Gyroscopes use massive spinning wheels. Because of their large angular momentum, they strongly resist any change in orientation, keeping satellites precisely pointed.",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          {/* Satellite body */}
          <rect x="60" y="50" width="80" height="50" rx="5" fill="#64748b" />
          {/* Solar panels */}
          <rect x="10" y="60" width="45" height="30" fill="#3b82f6" />
          <rect x="145" y="60" width="45" height="30" fill="#3b82f6" />
          {/* Gyroscope wheel inside */}
          <g transform={`translate(100, 75) rotate(${rotation * 2})`}>
            <ellipse cx="0" cy="0" rx="20" ry="8" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
            <line x1="-20" y1="0" x2="20" y2="0" stroke="#d97706" strokeWidth="2" />
          </g>
          {/* L vector */}
          <line x1="100" y1="55" x2="100" y2="25" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrowGreen)" />
          <text x="108" y="35" fill="#10b981" fontSize="12" fontWeight="bold">L</text>
          <text x="100" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">Large I → stable orientation</text>
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
                ? 'bg-pink-600 text-white'
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
            ✓ Mark as Understood
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
          className="mt-6 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
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
                        ? 'bg-pink-600 text-white'
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
                : 'bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:from-pink-500 hover:to-purple-500'
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
              ? 'Excellent! You\'ve mastered moment of inertia and angular momentum!'
              : 'Keep studying! Review the concepts and try again.'}
          </p>

          {calculateScore() >= 7 ? (
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
            >
              Claim Your Mastery Badge →
            </button>
          ) : (
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase(3); }}
              className="px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
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
      <div className="bg-gradient-to-br from-pink-900/50 via-purple-900/50 to-indigo-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">⛸️</div>
        <h1 className="text-3xl font-bold text-white mb-4">Rotational Dynamics Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered moment of inertia and angular momentum conservation!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⚖️</div>
            <p className="text-sm text-slate-300">Moment of Inertia</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔄</div>
            <p className="text-sm text-slate-300">Angular Momentum</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">💫</div>
            <p className="text-sm text-slate-300">Conservation Laws</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🌟</div>
            <p className="text-sm text-slate-300">Stellar Spin-Up</p>
          </div>
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

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Ambient background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Premium progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/70 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-400">Moment of Inertia</span>
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
                    ? 'bg-pink-500'
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

export default MomentOfInertiaRenderer;
