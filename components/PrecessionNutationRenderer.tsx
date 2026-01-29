import React, { useState, useEffect, useCallback, useRef } from 'react';

// Gold standard types
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

const PrecessionNutationRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
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

  // Animation states
  const [topAngle, setTopAngle] = useState(0); // spin angle
  const [precessionAngle, setPrecessionAngle] = useState(0); // precession around vertical
  const [nutationPhase, setNutationPhase] = useState(0); // nutation wobble phase
  const [spinSpeed, setSpinSpeed] = useState(5); // radians per frame
  const [tiltAngle, setTiltAngle] = useState(20); // tilt from vertical (degrees)
  const [showVectors, setShowVectors] = useState(true);
  const [isSpinning, setIsSpinning] = useState(true);
  const [hasGravity, setHasGravity] = useState(true);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Phase sync with external control
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

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

  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete, onGameEvent]);

  // Top animation
  useEffect(() => {
    if (!isSpinning) return;

    const interval = setInterval(() => {
      setTopAngle(prev => (prev + spinSpeed) % 360);

      // Precession only occurs with gravity
      if (hasGravity && tiltAngle > 0) {
        // Precession rate inversely proportional to spin speed
        const precessionRate = 0.3 * (tiltAngle / 20) / (spinSpeed / 5);
        setPrecessionAngle(prev => (prev + precessionRate) % 360);
        setNutationPhase(prev => (prev + 0.15) % (2 * Math.PI));
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isSpinning, spinSpeed, tiltAngle, hasGravity]);

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
    playSound(prediction === 'B' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'success' : 'failure');
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
      question: "What causes a spinning top to precess?",
      options: [
        { text: "Air resistance", correct: false },
        { text: "Gravity creating torque on the tilted angular momentum", correct: true },
        { text: "Friction with the surface", correct: false },
        { text: "The spin slowing down", correct: false }
      ]
    },
    {
      question: "As a top spins faster, its precession rate:",
      options: [
        { text: "Increases", correct: false },
        { text: "Decreases", correct: true },
        { text: "Stays the same", correct: false },
        { text: "Becomes chaotic", correct: false }
      ]
    },
    {
      question: "Nutation is best described as:",
      options: [
        { text: "The main spin of the top", correct: false },
        { text: "The slow circular motion of the axis", correct: false },
        { text: "A wobbling superimposed on precession", correct: true },
        { text: "The friction slowing the top", correct: false }
      ]
    },
    {
      question: "Earth's axial precession takes approximately how long to complete one cycle?",
      options: [
        { text: "1 year", correct: false },
        { text: "100 years", correct: false },
        { text: "2,600 years", correct: false },
        { text: "26,000 years", correct: true }
      ]
    },
    {
      question: "In zero gravity, a spinning top would:",
      options: [
        { text: "Fall immediately", correct: false },
        { text: "Precess faster", correct: false },
        { text: "Spin with no precession", correct: true },
        { text: "Stop spinning", correct: false }
      ]
    },
    {
      question: "The torque causing precession acts:",
      options: [
        { text: "Parallel to angular momentum", correct: false },
        { text: "Perpendicular to angular momentum", correct: true },
        { text: "Opposite to angular momentum", correct: false },
        { text: "In random directions", correct: false }
      ]
    },
    {
      question: "Which object demonstrates precession in medical imaging?",
      options: [
        { text: "X-ray tubes", correct: false },
        { text: "Ultrasound transducers", correct: false },
        { text: "Protons in MRI machines", correct: true },
        { text: "CT scanner rotors", correct: false }
      ]
    },
    {
      question: "If you increase a top's tilt angle, precession rate:",
      options: [
        { text: "Decreases", correct: false },
        { text: "Increases", correct: true },
        { text: "Stays the same", correct: false },
        { text: "Reverses direction", correct: false }
      ]
    },
    {
      question: "The precession of Earth's axis causes:",
      options: [
        { text: "Seasons", correct: false },
        { text: "Day and night", correct: false },
        { text: "Changes in the North Star over millennia", correct: true },
        { text: "Tides", correct: false }
      ]
    },
    {
      question: "Gyroscopic stabilization in ships uses precession to:",
      options: [
        { text: "Speed up the ship", correct: false },
        { text: "Resist tilting motions", correct: true },
        { text: "Navigate", correct: false },
        { text: "Generate power", correct: false }
      ]
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  const renderTop = (showLabels: boolean = true, size: number = 200) => {
    const nutationOffset = hasGravity ? Math.sin(nutationPhase) * 2 : 0;
    const effectiveTilt = hasGravity ? tiltAngle + nutationOffset : 0;
    const centerX = size / 2;
    const centerY = size / 2;

    return (
      <svg width={size} height={size} className="overflow-visible">
        {/* Reference circle (ground plane) */}
        <ellipse
          cx={centerX}
          cy={centerY + 40}
          rx={60}
          ry={15}
          fill="none"
          stroke="rgba(100, 116, 139, 0.3)"
          strokeWidth="1"
          strokeDasharray="4 2"
        />

        {/* Precession path */}
        {hasGravity && effectiveTilt > 0 && (
          <ellipse
            cx={centerX}
            cy={centerY - 20}
            rx={Math.sin(effectiveTilt * Math.PI / 180) * 50}
            ry={Math.sin(effectiveTilt * Math.PI / 180) * 15}
            fill="none"
            stroke="rgba(59, 130, 246, 0.4)"
            strokeWidth="2"
            strokeDasharray="6 3"
          />
        )}

        {/* Top body */}
        <g transform={`rotate(${effectiveTilt}, ${centerX}, ${centerY + 40})`}>
          <g transform={`translate(${centerX}, ${centerY})`}>
            {/* Spinning disc decoration */}
            <g transform={`rotate(${topAngle})`}>
              <ellipse cx="0" cy="0" rx="35" ry="10" fill="url(#topGradient)" />
              {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                <line
                  key={i}
                  x1="0" y1="0"
                  x2={Math.cos(angle * Math.PI / 180) * 32}
                  y2={Math.sin(angle * Math.PI / 180) * 8}
                  stroke={i % 2 === 0 ? '#ef4444' : '#3b82f6'}
                  strokeWidth="3"
                />
              ))}
            </g>

            {/* Top cone (body) */}
            <polygon
              points="0,40 -25,-5 25,-5"
              fill="url(#coneGradient)"
            />

            {/* Top handle */}
            <rect x="-6" y="-30" width="12" height="25" rx="3" fill="url(#handleGradient)" />
            <circle cx="0" cy="-30" r="8" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
          </g>

          {/* Angular momentum vector (L) */}
          {showVectors && (
            <g transform={`translate(${centerX}, ${centerY - 10})`}>
              <line
                x1="0" y1="0"
                x2="0" y2={-50 - spinSpeed * 3}
                stroke="#10b981"
                strokeWidth="3"
                markerEnd="url(#arrowGreen)"
              />
              {showLabels && (
                <text x="10" y={-40 - spinSpeed * 2} fill="#10b981" fontSize="14" fontWeight="bold">L</text>
              )}
            </g>
          )}
        </g>

        {/* Torque vector (τ) - only with gravity */}
        {showVectors && hasGravity && effectiveTilt > 0 && (
          <g transform={`translate(${centerX}, ${centerY - 10})`}>
            <line
              x1="0" y1="0"
              x2={Math.cos(precessionAngle * Math.PI / 180 + Math.PI/2) * 40}
              y2={Math.sin(precessionAngle * Math.PI / 180 + Math.PI/2) * 12}
              stroke="#f59e0b"
              strokeWidth="3"
              markerEnd="url(#arrowOrange)"
            />
            {showLabels && (
              <text
                x={Math.cos(precessionAngle * Math.PI / 180 + Math.PI/2) * 50}
                y={Math.sin(precessionAngle * Math.PI / 180 + Math.PI/2) * 15}
                fill="#f59e0b" fontSize="14" fontWeight="bold"
              >τ</text>
            )}
          </g>
        )}

        {/* Gravity vector */}
        {showVectors && hasGravity && (
          <g>
            <line
              x1={centerX + 60} y1={centerY - 20}
              x2={centerX + 60} y2={centerY + 30}
              stroke="#ef4444"
              strokeWidth="2"
              markerEnd="url(#arrowRed)"
            />
            {showLabels && (
              <text x={centerX + 68} y={centerY + 10} fill="#ef4444" fontSize="12" fontWeight="bold">g</text>
            )}
          </g>
        )}

        {/* Definitions */}
        <defs>
          <linearGradient id="topGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="coneGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="handleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#78716c" />
            <stop offset="100%" stopColor="#a8a29e" />
          </linearGradient>
          <marker id="arrowGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#10b981" />
          </marker>
          <marker id="arrowOrange" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#f59e0b" />
          </marker>
          <marker id="arrowRed" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
          </marker>
        </defs>
      </svg>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-indigo-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
        The Wobbling Mystery
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover the physics behind spinning tops and gyroscopes
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 rounded-3xl" />

        <div className="relative">
          {renderTop(false, 220)}

          <div className="mt-8 space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Spin a top and watch it carefully.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              The top stays upright, but its axis slowly traces a circle in the air while wobbling up and down.
            </p>
            <div className="pt-2">
              <p className="text-base text-indigo-400 font-semibold">
                Why doesn't it just fall over? And what causes this strange circular dance?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Investigate the Wobble
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-indigo-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-indigo-400">✦</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-indigo-400">✦</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A spinning top is tilted at an angle. What happens to the direction its spin axis points?
        </p>
        {renderTop(false, 180)}
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The axis stays fixed, pointing the same direction' },
          { id: 'B', text: 'The axis slowly rotates around the vertical (precession)' },
          { id: 'C', text: 'The axis immediately falls toward the ground' },
          { id: 'D', text: 'The axis wobbles randomly in all directions' }
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
            ✓ Correct! This circular motion of the spin axis is called <span className="text-cyan-400">precession</span>.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all duration-300"
          >
            Explore the Physics →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Interactive Precession Lab</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderTop(true, 250)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Spin Speed: {spinSpeed.toFixed(1)} rad/frame</label>
          <input
            type="range"
            min="1"
            max="15"
            step="0.5"
            value={spinSpeed}
            onChange={(e) => setSpinSpeed(parseFloat(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <p className="text-xs text-slate-400 mt-1">Faster spin = slower precession</p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Tilt Angle: {tiltAngle}°</label>
          <input
            type="range"
            min="5"
            max="45"
            value={tiltAngle}
            onChange={(e) => setTiltAngle(parseInt(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <p className="text-xs text-slate-400 mt-1">More tilt = faster precession</p>
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
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowVectors(!showVectors); }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showVectors ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-600 hover:bg-slate-500'
          } text-white`}
        >
          {showVectors ? '👁 Vectors On' : '👁 Vectors Off'}
        </button>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-2">Key Insight:</h3>
        <p className="text-slate-300 text-sm">
          <span className="text-emerald-400 font-semibold">L</span> = Angular momentum (green) points along the spin axis.
          Gravity creates a <span className="text-amber-400 font-semibold">torque τ</span> (orange) perpendicular to L.
          This torque doesn't make the top fall—it changes the <em>direction</em> of L, causing precession!
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all duration-300"
      >
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Precession & Nutation</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-indigo-400 mb-3">🔄 Precession</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• The slow rotation of the spin axis around the vertical</li>
            <li>• Caused by gravity's torque on tilted angular momentum</li>
            <li>• Faster spin → slower precession rate</li>
            <li>• Greater tilt → faster precession rate</li>
            <li>• τ = dL/dt causes L to change direction, not magnitude</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">〰️ Nutation</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• A wobbling motion superimposed on precession</li>
            <li>• The axis "nods" up and down while precessing</li>
            <li>• Results from initial conditions when released</li>
            <li>• Eventually damps out due to friction</li>
            <li>• Creates a wavy or loopy path for the axis</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">⚙️ The Physics</h3>
          <div className="text-slate-300 text-sm space-y-2">
            <p><strong>Angular Momentum:</strong> L = Iω (moment of inertia × angular velocity)</p>
            <p><strong>Torque:</strong> τ = r × F = r × mg (gravity acting on center of mass)</p>
            <p><strong>Precession Rate:</strong> Ω = mgr / (Iω) — inversely proportional to spin speed!</p>
            <p className="text-cyan-400 mt-3">
              The faster you spin, the more "gyroscopic rigidity" resists changes, resulting in slower precession.
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
          Imagine you're an astronaut on the International Space Station, floating in microgravity. You spin a top and release it tilted at an angle.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What will the top's axis do in zero gravity?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Precess even faster without friction from a surface' },
          { id: 'B', text: 'Immediately flip over and spin upside down' },
          { id: 'C', text: 'Spin with no precession - axis stays fixed in space' },
          { id: 'D', text: 'Wobble chaotically in random directions' }
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
            ✓ Exactly! Without gravity, there's no torque, so no precession occurs!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            The axis stays fixed in space—this is how gyroscopes maintain orientation in spacecraft.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
          >
            See It in Action →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Zero Gravity Experiment</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2 text-center">With Gravity</h3>
          <div className="flex justify-center">
            <svg width="180" height="180" className="overflow-visible">
              {/* Mini version with gravity */}
              <ellipse cx="90" cy="130" rx="40" ry="10" fill="none" stroke="rgba(100, 116, 139, 0.3)" strokeWidth="1" />
              <ellipse cx="90" cy="70" rx="25" ry="8" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2" strokeDasharray="4 2" />
              <g transform={`rotate(${tiltAngle}, 90, 130)`}>
                <g transform="translate(90, 90)">
                  <g transform={`rotate(${topAngle})`}>
                    <ellipse cx="0" cy="0" rx="25" ry="7" fill="#6366f1" />
                  </g>
                  <polygon points="0,30 -18,-3 18,-3" fill="#64748b" />
                </g>
                <line x1="90" y1="75" x2="90" y2="35" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowGreen)" />
              </g>
              <text x="90" y="165" textAnchor="middle" fill="#ef4444" fontSize="12">Precession ✓</text>
            </svg>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-amber-400 mb-2 text-center">Zero Gravity</h3>
          <div className="flex justify-center">
            <svg width="180" height="180" className="overflow-visible">
              {/* Mini version without gravity - no precession */}
              <g transform={`rotate(${hasGravity ? 0 : tiltAngle}, 90, 90)`}>
                <g transform="translate(90, 90)">
                  <g transform={`rotate(${topAngle})`}>
                    <ellipse cx="0" cy="0" rx="25" ry="7" fill="#f59e0b" />
                  </g>
                  <polygon points="0,30 -18,-3 18,-3" fill="#64748b" />
                </g>
                <line x1="90" y1="75" x2="90" y2="35" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowGreen)" />
              </g>
              <text x="90" y="165" textAnchor="middle" fill="#10b981" fontSize="12">Axis Fixed ✓</text>
              {/* Stars for space effect */}
              {[1,2,3,4,5,6,7,8].map(i => (
                <circle key={i} cx={20 + (i * 20) % 150} cy={15 + (i * 17) % 40} r="1" fill="white" opacity="0.6" />
              ))}
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Toggle Gravity:</h3>
        <button
          onMouseDown={(e) => { e.preventDefault(); setHasGravity(!hasGravity); }}
          className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
            hasGravity
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-purple-600 hover:bg-purple-500 text-white'
          }`}
        >
          {hasGravity ? '🌍 Gravity ON' : '🚀 Zero-G Mode'}
        </button>
        <p className="text-slate-400 text-sm mt-3">
          {hasGravity
            ? 'Watch the axis precess around the vertical...'
            : 'The axis stays fixed! No gravity = no torque = no precession.'}
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
      >
        Review the Discovery →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">🌟 Key Discovery</h2>

      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-amber-400 mb-4">Precession Requires Torque!</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            <span className="text-cyan-400 font-semibold">On Earth:</span> Gravity pulls on the tilted top's center of mass, creating a torque that causes precession.
          </p>
          <p>
            <span className="text-purple-400 font-semibold">In Space:</span> No gravity means no torque. Angular momentum is perfectly conserved, so the spin axis stays fixed.
          </p>
          <p className="text-amber-300 font-medium">
            This principle is why spacecraft use gyroscopes—they maintain their orientation without any external reference!
          </p>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 max-w-2xl">
        <p className="text-slate-300 text-sm">
          <strong className="text-cyan-400">Real Example:</strong> The Hubble Space Telescope uses gyroscopes to point at distant galaxies with incredible precision. The spinning rotors resist any change in orientation due to conservation of angular momentum.
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); setHasGravity(true); goToPhase(7); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all duration-300"
      >
        Explore Real-World Applications →
      </button>
    </div>
  );

  const applications = [
    {
      title: "Earth's Axial Precession",
      icon: "🌍",
      description: "Earth's axis precesses once every 26,000 years, changing which star is our 'North Star' over millennia.",
      details: "Currently Polaris is our North Star, but in 12,000 years it will be Vega. This precession also causes the equinoxes to slowly shift through the zodiac constellations.",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          <defs>
            <radialGradient id="earthGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#1e40af" />
            </radialGradient>
          </defs>
          {/* Stars */}
          {[1,2,3,4,5,6,7,8,9,10].map(i => (
            <circle key={i} cx={15 + (i * 19)} cy={10 + (i % 3) * 15} r="1.5" fill="white" opacity="0.7" />
          ))}
          {/* Precession circle */}
          <ellipse cx="100" cy="30" rx="25" ry="8" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" />
          {/* Earth */}
          <g transform={`rotate(${precessionAngle / 2}, 100, 90)`}>
            <ellipse cx="100" cy="90" rx="35" ry="35" fill="url(#earthGrad)" />
            <ellipse cx="100" cy="90" rx="35" ry="10" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.5" />
            {/* Axis */}
            <line x1="100" y1="90" x2="100" y2="25" stroke="#ef4444" strokeWidth="2" />
            <circle cx="100" cy="25" r="4" fill="#fbbf24" /> {/* North star */}
          </g>
          <text x="100" y="145" textAnchor="middle" fill="#94a3b8" fontSize="10">26,000 year cycle</text>
        </svg>
      )
    },
    {
      title: "Spacecraft Attitude Control",
      icon: "🛰️",
      description: "Spacecraft use gyroscopes to maintain orientation. When the gyro spins, its axis resists change.",
      details: "Control Moment Gyroscopes (CMGs) can tilt a spacecraft by tilting their spinning rotors. This uses no fuel—just the transfer of angular momentum!",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          {/* Stars */}
          {[1,2,3,4,5,6,7,8].map(i => (
            <circle key={i} cx={20 + (i * 22)} cy={15 + (i % 4) * 10} r="1" fill="white" opacity="0.5" />
          ))}
          {/* Satellite body */}
          <rect x="70" y="55" width="60" height="40" rx="4" fill="#64748b" />
          {/* Solar panels */}
          <rect x="20" y="65" width="45" height="20" fill="#3b82f6" />
          <rect x="135" y="65" width="45" height="20" fill="#3b82f6" />
          {/* Gyroscope inside */}
          <g transform={`rotate(${topAngle * 0.5}, 100, 75)`}>
            <ellipse cx="100" cy="75" rx="15" ry="5" fill="#f59e0b" />
          </g>
          {/* Angular momentum vector */}
          <line x1="100" y1="60" x2="100" y2="40" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowGreen)" />
          <text x="100" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">Gyro maintains orientation</text>
        </svg>
      )
    },
    {
      title: "MRI/NMR Imaging",
      icon: "🏥",
      description: "Protons in your body act like tiny spinning tops. In MRI, their precession reveals tissue structure.",
      details: "When placed in a magnetic field, protons precess at the Larmor frequency. Radio waves at this frequency cause resonance, and the returning signal creates detailed images.",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          {/* Magnetic field lines */}
          {[-1, 0, 1].map(i => (
            <line key={i} x1={60 + i*40} y1="20" x2={60 + i*40} y2="130" stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
          ))}
          <text x="100" y="15" textAnchor="middle" fill="#60a5fa" fontSize="10">B-field</text>
          {/* Protons precessing */}
          {[0, 1, 2].map(i => {
            const phase = (precessionAngle + i * 120) * Math.PI / 180;
            const cx = 100 + Math.cos(phase) * 30;
            const cy = 75 + Math.sin(phase) * 10;
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r="8" fill="#ef4444" />
                <line x1={cx} y1={cy - 8} x2={cx + Math.cos(phase) * 12} y2={cy - 8 - 15} stroke="#10b981" strokeWidth="2" />
              </g>
            );
          })}
          {/* Precession circle */}
          <ellipse cx="100" cy="60" rx="30" ry="10" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 2" />
          <text x="100" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">Proton spins precess</text>
        </svg>
      )
    },
    {
      title: "Neutron Star Precession",
      icon: "⭐",
      description: "Neutron stars are massive, rapidly spinning remnants of supernovae that can precess due to asymmetries.",
      details: "Pulsars emit beams of radiation. If the star precesses, the beam sweeps out a different pattern over time—this has been observed in several pulsars!",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          {/* Stars background */}
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
            <circle key={i} cx={10 + (i * 16)} cy={10 + (i % 5) * 25} r="1" fill="white" opacity="0.4" />
          ))}
          {/* Neutron star */}
          <g transform={`rotate(${nutationPhase * 5}, 100, 75)`}>
            <circle cx="100" cy="75" r="20" fill="url(#neutronGrad)" />
            {/* Radiation beams */}
            <polygon points="100,55 95,5 105,5" fill="#a855f7" opacity="0.7" />
            <polygon points="100,95 95,145 105,145" fill="#a855f7" opacity="0.7" />
            {/* Spin lines */}
            <ellipse cx="100" cy="75" rx="22" ry="5" fill="none" stroke="#f59e0b" strokeWidth="1" />
          </g>
          <defs>
            <radialGradient id="neutronGrad">
              <stop offset="0%" stopColor="#f0f0f0" />
              <stop offset="100%" stopColor="#6366f1" />
            </radialGradient>
          </defs>
          <text x="100" y="145" textAnchor="middle" fill="#94a3b8" fontSize="10">Precessing pulsar beam</text>
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
                ? 'bg-indigo-600 text-white'
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
          className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all duration-300"
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
                        ? 'bg-indigo-600 text-white'
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
            onMouseDown={(e) => { e.preventDefault(); setShowTestResults(true); }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500'
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
              ? 'Excellent! You\'ve mastered precession and nutation!'
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
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all duration-300"
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
      <div className="bg-gradient-to-br from-indigo-900/50 via-purple-900/50 to-pink-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🌀</div>
        <h1 className="text-3xl font-bold text-white mb-4">Precession Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the physics of precession and nutation!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔄</div>
            <p className="text-sm text-slate-300">Precession Physics</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">〰️</div>
            <p className="text-sm text-slate-300">Nutation Dynamics</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🚀</div>
            <p className="text-sm text-slate-300">Space Applications</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🧲</div>
            <p className="text-sm text-slate-300">Torque & Angular Momentum</p>
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
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Precession & Nutation</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-indigo-400 w-6 shadow-lg shadow-indigo-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-indigo-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">
        {renderPhase()}
      </div>
    </div>
  );
};

export default PrecessionNutationRenderer;
