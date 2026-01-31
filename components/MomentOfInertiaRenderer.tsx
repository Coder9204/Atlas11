import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// MOMENT OF INERTIA RENDERER - 10-PHASE STRUCTURE
// Covers rotational inertia, I = mr², and conservation of angular momentum
// ============================================================================

// Phase type - string-based for clarity
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Scenario',
  twist_play: 'Spin Simulation',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

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
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

const MomentOfInertiaRenderer: React.FC<Props> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Animation states
  const [rotation, setRotation] = useState(0);
  const [armExtension, setArmExtension] = useState(1); // 0 = tucked, 1 = extended
  const [angularVelocity, setAngularVelocity] = useState(3); // base spin rate
  const [isSpinning, setIsSpinning] = useState(true);
  const [initialL, setInitialL] = useState(15); // constant angular momentum

  const lastClickRef = useRef(0);

  // Responsive design
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
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  const goToPhase = useCallback((newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 300) return;
    lastClickRef.current = now;
    playSound('transition');
    setPhase(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseName: phaseLabels[newPhase] } });
    onPhaseComplete?.(newPhase);
  }, [playSound, onGameEvent, onPhaseComplete]);

  // Calculate effective angular velocity based on arm position
  // L = I * omega is constant, so omega = L / I
  // When arms are tucked (extension=0), I is smaller, so omega is larger
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
      options: [
        { text: "Angular velocity", correct: false },
        { text: "Angular momentum", correct: true },
        { text: "Rotational energy", correct: false },
        { text: "Moment of inertia", correct: false }
      ]
    },
    {
      question: "When a skater pulls in their arms, their moment of inertia:",
      options: [
        { text: "Increases", correct: false },
        { text: "Decreases", correct: true },
        { text: "Stays the same", correct: false },
        { text: "Becomes zero", correct: false }
      ]
    },
    {
      question: "The moment of inertia depends on:",
      options: [
        { text: "Only the total mass", correct: false },
        { text: "Mass distribution relative to the rotation axis", correct: true },
        { text: "Only the rotation speed", correct: false },
        { text: "The temperature", correct: false }
      ]
    },
    {
      question: "Angular momentum L is calculated as:",
      options: [
        { text: "L = mv", correct: false },
        { text: "L = I times omega", correct: true },
        { text: "L = half I omega squared", correct: false },
        { text: "L = mgh", correct: false }
      ]
    },
    {
      question: "A diver in the tuck position spins faster because:",
      options: [
        { text: "They have more energy", correct: false },
        { text: "Their moment of inertia is smaller", correct: true },
        { text: "Gravity pulls them faster", correct: false },
        { text: "Air resistance is lower", correct: false }
      ]
    },
    {
      question: "When a neutron star collapses and shrinks, its spin rate:",
      options: [
        { text: "Decreases dramatically", correct: false },
        { text: "Increases dramatically", correct: true },
        { text: "Stays exactly the same", correct: false },
        { text: "Becomes zero", correct: false }
      ]
    },
    {
      question: "Which shape has the largest moment of inertia for the same mass?",
      options: [
        { text: "Solid sphere", correct: false },
        { text: "Hollow sphere", correct: true },
        { text: "Point mass at center", correct: false },
        { text: "All have the same I", correct: false }
      ]
    },
    {
      question: "If you double the distance of a mass from the rotation axis, its contribution to I:",
      options: [
        { text: "Doubles", correct: false },
        { text: "Quadruples", correct: true },
        { text: "Halves", correct: false },
        { text: "Stays the same", correct: false }
      ]
    },
    {
      question: "When an ice skater extends their arms, their kinetic energy:",
      options: [
        { text: "Increases", correct: false },
        { text: "Decreases", correct: true },
        { text: "Stays constant", correct: false },
        { text: "Becomes negative", correct: false }
      ]
    },
    {
      question: "The equation I = mr squared shows that moment of inertia depends on distance:",
      options: [
        { text: "Linearly", correct: false },
        { text: "Quadratically (squared)", correct: true },
        { text: "Cubically", correct: false },
        { text: "Exponentially", correct: false }
      ]
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
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

  // ============================================================================
  // PHASE: HOOK - Welcome page explaining moment of inertia
  // ============================================================================
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-8 px-6">
      {/* Premium badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
        <span className="text-pink-400/80 text-sm font-medium tracking-wide uppercase">Rotational Mechanics</span>
      </div>

      {/* Gradient title */}
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-3 bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
        Moment of Inertia
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg md:text-xl text-center mb-8 max-w-lg">
        Discover how mass distribution affects rotation
      </p>

      {/* Premium card */}
      <div className="w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        <div className="flex justify-center">
          {renderSkater(0.3, rotation, 180)}
        </div>
        <div className="mt-4 space-y-3 text-gray-300 text-center">
          <p className="leading-relaxed">
            <strong className="text-pink-400">Moment of inertia</strong> (also called rotational inertia) is how much an object resists changes to its rotation.
          </p>
          <p className="text-sm text-slate-400">
            It depends not just on mass, but on how that mass is distributed relative to the axis of rotation.
          </p>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => goToPhase('predict')}
        style={{ zIndex: 10 }}
        className="group px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 flex items-center gap-2"
      >
        Make a Prediction
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      {/* Hint text */}
      <p className="text-slate-500 text-sm mt-6">
        Learn why ice skaters spin faster with tucked arms
      </p>
    </div>
  );

  // ============================================================================
  // PHASE: PREDICT - Prediction about which shape rolls down a ramp faster
  // ============================================================================
  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A <span className="text-pink-400 font-semibold">solid disk</span> and a <span className="text-cyan-400 font-semibold">ring</span> (hoop) have the same mass and radius. They roll down a ramp from the same height.
        </p>
        <div className="flex justify-center gap-8 my-6">
          {/* Solid disk */}
          <div className="text-center">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="35" fill="#ec4899" opacity="0.8" stroke="#be185d" strokeWidth="2" />
              <circle cx="40" cy="40" r="5" fill="#be185d" />
            </svg>
            <p className="text-sm text-pink-400 mt-2">Solid Disk</p>
          </div>
          {/* Ring */}
          <div className="text-center">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="35" fill="none" stroke="#22d3ee" strokeWidth="8" />
              <circle cx="40" cy="40" r="5" fill="#06b6d4" />
            </svg>
            <p className="text-sm text-cyan-400 mt-2">Ring (Hoop)</p>
          </div>
        </div>
        <p className="text-lg text-cyan-400 font-medium">
          Which one reaches the bottom first?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The ring reaches the bottom first' },
          { id: 'B', text: 'The solid disk reaches the bottom first' },
          { id: 'C', text: 'They reach the bottom at the same time' },
          { id: 'D', text: 'It depends on the mass' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            style={{ zIndex: 10 }}
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
            The solid disk wins! It has a <span className="text-pink-400">lower moment of inertia</span> relative to its mass.
          </p>
          <p className="text-slate-400 text-sm mt-2">
            More of its energy goes into linear motion rather than rotation.
          </p>
          <button
            onClick={() => goToPhase('play')}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // PHASE: PLAY - Interactive simulation with different shapes
  // ============================================================================
  const renderPlay = () => {
    const momentOfInertia = 1 + 2 * armExtension;
    const currentOmega = calculateOmega(armExtension);

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Shape Comparison Lab</h2>

        {/* Shape formulas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 max-w-3xl w-full">
          {[
            { name: 'Solid Disk', formula: 'I = (1/2)MR^2', color: 'pink' },
            { name: 'Ring (Hoop)', formula: 'I = MR^2', color: 'cyan' },
            { name: 'Solid Sphere', formula: 'I = (2/5)MR^2', color: 'emerald' },
            { name: 'Hollow Sphere', formula: 'I = (2/3)MR^2', color: 'amber' }
          ].map((shape, idx) => (
            <div key={idx} className={`bg-slate-800/50 rounded-xl p-3 border border-${shape.color}-500/30`}>
              <p className={`text-${shape.color}-400 font-semibold text-sm`}>{shape.name}</p>
              <p className="text-slate-300 text-xs mt-1 font-mono">{shape.formula}</p>
            </div>
          ))}
        </div>

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
              <span>Tucked (Low I)</span>
              <span>Extended (High I)</span>
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
              <div className="text-sm text-slate-300">Angular Velocity (omega)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{initialL.toFixed(0)}</div>
              <div className="text-sm text-slate-300">L = I times omega (constant!)</div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setIsSpinning(!isSpinning)}
            style={{ zIndex: 10 }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isSpinning ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
            } text-white`}
          >
            {isSpinning ? 'Pause' : 'Play'}
          </button>
        </div>

        <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2">Key Insight:</h3>
          <p className="text-slate-300 text-sm">
            <span className="text-pink-400 font-semibold">L = I times omega</span> is constant. When you decrease <span className="text-pink-400">I</span> by pulling in arms, <span className="text-cyan-400">omega</span> must increase to keep L the same!
          </p>
        </div>

        <button
          onClick={() => goToPhase('review')}
          style={{ zIndex: 10 }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
        >
          Review the Concepts
        </button>
      </div>
    );
  };

  // ============================================================================
  // PHASE: REVIEW - Explain I = mr^2 and formulas for different shapes
  // ============================================================================
  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Moment of Inertia</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-pink-900/50 to-purple-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-pink-400 mb-3">The Formula: I = mr^2</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>For a point mass: <span className="text-cyan-400 font-mono">I = mr^2</span></li>
            <li><strong>m</strong> = mass of the object</li>
            <li><strong>r</strong> = distance from the rotation axis</li>
            <li>Distance is <span className="text-pink-400">squared</span> - doubling r quadruples I!</li>
            <li>Mass far from the axis contributes more to I</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">Common Shapes</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>Solid disk/cylinder: <span className="text-pink-400 font-mono">I = (1/2)MR^2</span></li>
            <li>Ring/hoop: <span className="text-pink-400 font-mono">I = MR^2</span></li>
            <li>Solid sphere: <span className="text-pink-400 font-mono">I = (2/5)MR^2</span></li>
            <li>Hollow sphere: <span className="text-pink-400 font-mono">I = (2/3)MR^2</span></li>
            <li>The ring has the highest I for same mass and radius!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Why It Matters for Rolling</h3>
          <div className="text-slate-300 text-sm space-y-2">
            <p>When an object rolls down a ramp, its potential energy converts to:</p>
            <p><strong>1. Translational KE:</strong> (1/2)mv^2 (moving forward)</p>
            <p><strong>2. Rotational KE:</strong> (1/2)I omega^2 (spinning)</p>
            <p className="text-cyan-400 mt-3">
              Objects with lower I (like solid disks) put more energy into translation and roll faster!
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{ zIndex: 10 }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
      >
        Discover a Surprising Twist
      </button>
    </div>
  );

  // ============================================================================
  // PHASE: TWIST_PREDICT - Scenario about figure skater spinning
  // ============================================================================
  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Figure Skater Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A figure skater is spinning with arms extended. They then pull their arms in close to their body.
        </p>
        <div className="flex justify-center gap-4 my-4">
          {renderSkater(1, 0, 120)}
          <div className="flex items-center text-2xl text-cyan-400">then</div>
          {renderSkater(0, 0, 120)}
        </div>
        <p className="text-lg text-cyan-400 font-medium">
          What happens to their spin speed?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Spin speed increases significantly' },
          { id: 'B', text: 'Spin speed stays the same' },
          { id: 'C', text: 'Spin speed decreases' },
          { id: 'D', text: 'The skater stops spinning' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            style={{ zIndex: 10 }}
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
            Correct! The spin speed increases dramatically!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            This is due to <span className="text-cyan-400 font-semibold">conservation of angular momentum</span>. When I decreases, omega must increase!
          </p>
          <button
            onClick={() => goToPhase('twist_play')}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
          >
            See It In Action
          </button>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // PHASE: TWIST_PLAY - Interactive simulation showing arms in/out effect
  // ============================================================================
  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Arms In vs Arms Out</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 max-w-2xl w-full">
        <div className="flex justify-center">
          {renderSkater(armExtension, rotation, 220)}
        </div>

        <div className="mt-4">
          <label className="text-slate-300 text-sm block mb-2">
            Arm Position: <span className="text-pink-400 font-semibold">{armExtension < 0.3 ? 'Tucked In' : armExtension > 0.7 ? 'Extended Out' : 'Partial'}</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={armExtension}
            onChange={(e) => setArmExtension(parseFloat(e.target.value))}
            className="w-full accent-amber-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-pink-400">{(1 + 2 * armExtension).toFixed(2)}</div>
            <div className="text-xs text-slate-400">Moment of Inertia (I)</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-cyan-400">{angularVelocity.toFixed(2)}</div>
            <div className="text-xs text-slate-400">Angular Velocity (omega)</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-3xl">
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-pink-400 mb-2 text-center">Arms Extended</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>Mass far from axis</li>
            <li>High moment of inertia</li>
            <li>Slow spin speed</li>
          </ul>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-amber-400 mb-2 text-center">Arms Tucked</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>Mass close to axis</li>
            <li>Low moment of inertia</li>
            <li>Fast spin speed!</li>
          </ul>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setIsSpinning(!isSpinning)}
          style={{ zIndex: 10 }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isSpinning ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
          } text-white`}
        >
          {isSpinning ? 'Pause Spin' : 'Resume Spin'}
        </button>
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
      >
        Review the Discovery
      </button>
    </div>
  );

  // ============================================================================
  // PHASE: TWIST_REVIEW - Explain conservation of angular momentum and how I affects omega
  // ============================================================================
  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Conservation of Angular Momentum</h2>

      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-amber-400 mb-4">The Key Equation: L = I times omega</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            <strong className="text-pink-400">L (Angular Momentum)</strong> is conserved when no external torque acts on a system.
          </p>
          <p>
            Since L = I times omega must stay constant:
          </p>
          <ul className="space-y-2 text-sm ml-4">
            <li>When <span className="text-pink-400">I decreases</span> (arms pulled in), <span className="text-cyan-400">omega must increase</span></li>
            <li>When <span className="text-pink-400">I increases</span> (arms extended), <span className="text-cyan-400">omega must decrease</span></li>
          </ul>
          <div className="bg-slate-800/50 rounded-lg p-4 mt-4">
            <p className="text-center font-mono">
              I<sub>1</sub> times omega<sub>1</sub> = I<sub>2</sub> times omega<sub>2</sub>
            </p>
            <p className="text-center text-sm text-slate-400 mt-2">
              If I drops by half, omega doubles!
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-lg font-bold text-emerald-400 mb-3">Real Example: Figure Skating</h3>
        <p className="text-slate-300 text-sm">
          A figure skater can go from 2 rotations per second (arms out) to over 6 rotations per second (arms tucked) - a 3x increase! Some elite skaters achieve over 300 RPM in their spins.
        </p>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  // ============================================================================
  // PHASE: TRANSFER - 4 real-world applications
  // ============================================================================
  const applications = [
    {
      title: "Figure Skating",
      icon: "Figure Skating",
      description: "Skaters control spin speed by adjusting body position. Tucked positions enable spins over 300 RPM!",
      details: "The scratch spin starts with arms extended, building angular momentum. As the skater pulls into a tight position, their moment of inertia can decrease by a factor of 3-4, tripling their spin rate."
    },
    {
      title: "Flywheels",
      icon: "Flywheels",
      description: "Heavy rotating wheels store kinetic energy efficiently using their high moment of inertia.",
      details: "Modern flywheel energy storage systems can store megawatts of power. The key is using materials that allow high rotation speeds while maximizing moment of inertia for energy storage."
    },
    {
      title: "Baseball Bats",
      icon: "Baseball Bats",
      description: "The distribution of mass along a bat affects how easily it can be swung.",
      details: "End-loaded bats have more mass toward the tip (higher I), generating more power but being harder to control. Balanced bats have mass distributed evenly, allowing faster swings with better control."
    },
    {
      title: "Diving",
      icon: "Diving",
      description: "Divers use tuck and pike positions to control rotation speed during complex maneuvers.",
      details: "A diver in layout position rotates slowly. Pulling into a tight tuck reduces I by about 3.5x, allowing rapid somersaults. They then extend to slow rotation for a clean entry."
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
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index
                ? 'bg-pink-600 text-white'
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.title}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xl font-bold text-white">{applications[activeAppTab].title}</h3>
        </div>

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
          onClick={() => goToPhase('test')}
          style={{ zIndex: 10 }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
        >
          Take the Knowledge Test
        </button>
      )}
    </div>
  );

  // ============================================================================
  // PHASE: TEST - 10 multiple choice questions
  // ============================================================================
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
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-pink-600 text-white'
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
              setTestScore(score);
              setShowTestResults(true);
            }}
            style={{ zIndex: 10 }}
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
          <div className="text-6xl mb-4">{testScore >= 7 ? 'Excellent!' : 'Keep Learning!'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Score: {testScore}/10
          </h3>
          <p className="text-slate-300 mb-6">
            {testScore >= 7
              ? 'Excellent! You have mastered moment of inertia and angular momentum!'
              : 'Keep studying! Review the concepts and try again.'}
          </p>

          {testScore >= 7 ? (
            <button
              onClick={() => goToPhase('mastery')}
              style={{ zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onClick={() => { setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase('review'); }}
              style={{ zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
            >
              Review and Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  // ============================================================================
  // PHASE: MASTERY - Congratulations page
  // ============================================================================
  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-pink-900/50 via-purple-900/50 to-indigo-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">Congratulations!</div>
        <h1 className="text-3xl font-bold text-white mb-4">Rotational Dynamics Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You have mastered moment of inertia and angular momentum conservation!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">I = mr^2</div>
            <p className="text-sm text-slate-300">Moment of Inertia</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">L = I times omega</div>
            <p className="text-sm text-slate-300">Angular Momentum</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">Conservation</div>
            <p className="text-sm text-slate-300">L stays constant</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">Applications</div>
            <p className="text-sm text-slate-300">Skating, Diving, Flywheels</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => goToPhase('hook')}
            style={{ zIndex: 10 }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            Explore Again
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER PHASE SWITCH
  // ============================================================================
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
            {phaseOrder.map((p, idx) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx <= phaseIndex
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
