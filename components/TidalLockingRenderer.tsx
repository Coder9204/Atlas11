import React, { useState, useEffect, useCallback, useRef } from 'react';

// Phase type for the 10-phase learning structure
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
}

const TidalLockingRenderer: React.FC<Props> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
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

  // Animation states
  const [orbitalAngle, setOrbitalAngle] = useState(0);
  const [moonRotation, setMoonRotation] = useState(0);
  const [isTidallyLocked, setIsTidallyLocked] = useState(true);
  const [showTidalBulge, setShowTidalBulge] = useState(true);
  const [timeScale, setTimeScale] = useState(1);
  const [isAnimating, setIsAnimating] = useState(true);

  const lastClickRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Phase sync with external control
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  const playSound = useCallback((soundType: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const sounds: Record<string, { freq: number; type: OscillatorType; duration: number }> = {
        'correct': { freq: 880, type: 'sine', duration: 0.15 },
        'incorrect': { freq: 220, type: 'square', duration: 0.3 },
        'complete': { freq: 587, type: 'sine', duration: 0.2 },
        'transition': { freq: 440, type: 'sine', duration: 0.1 }
      };

      const sound = sounds[soundType] || sounds['transition'];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(ctx.currentTime + sound.duration);
    } catch (e) {
      console.log(`Sound: ${soundType}`);
    }
  }, []);

  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
  }, [playSound, onPhaseComplete, onGameEvent]);

  // Orbital animation
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setOrbitalAngle(prev => (prev + 0.5 * timeScale) % 360);

      if (isTidallyLocked) {
        // Moon rotation matches orbital period - always shows same face
        setMoonRotation(prev => (prev + 0.5 * timeScale) % 360);
      } else {
        // Moon rotates faster - different faces visible
        setMoonRotation(prev => (prev + 2 * timeScale) % 360);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating, isTidallyLocked, timeScale]);

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
    playSound(prediction === 'C' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'C' } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'B' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'B' } });
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

  const testQuestions = [
    {
      question: "What causes tidal locking to occur?",
      options: [
        { text: "Magnetic attraction", correct: false },
        { text: "Tidal friction dissipating rotational energy", correct: true },
        { text: "Solar radiation", correct: false },
        { text: "The satellite's composition", correct: false }
      ]
    },
    {
      question: "When a body is tidally locked, its rotation period equals its:",
      options: [
        { text: "Day length of the parent body", correct: false },
        { text: "Orbital period", correct: true },
        { text: "Parent body's rotation period", correct: false },
        { text: "None - it stops rotating", correct: false }
      ]
    },
    {
      question: "The Moon's rotation period is approximately:",
      options: [
        { text: "1 day", correct: false },
        { text: "1 week", correct: false },
        { text: "27.3 days (same as its orbital period)", correct: true },
        { text: "365 days", correct: false }
      ]
    },
    {
      question: "Tidal bulges on a body are caused by:",
      options: [
        { text: "Internal heat", correct: false },
        { text: "Differential gravitational pull across the body", correct: true },
        { text: "Magnetic fields", correct: false },
        { text: "Solar wind", correct: false }
      ]
    },
    {
      question: "Which statement about the Earth-Moon system is true?",
      options: [
        { text: "Earth is already tidally locked to the Moon", correct: false },
        { text: "The Moon is moving closer to Earth", correct: false },
        { text: "Earth's rotation is gradually slowing", correct: true },
        { text: "Tidal locking cannot happen to Earth", correct: false }
      ]
    },
    {
      question: "Pluto and Charon are special because:",
      options: [
        { text: "Neither is tidally locked", correct: false },
        { text: "They are mutually tidally locked", correct: true },
        { text: "Only Charon is tidally locked", correct: false },
        { text: "They orbit the Sun together", correct: false }
      ]
    },
    {
      question: "An 'eyeball world' refers to a tidally locked exoplanet with:",
      options: [
        { text: "Unusual coloring", correct: false },
        { text: "A permanent day side and night side", correct: true },
        { text: "Multiple moons", correct: false },
        { text: "A ring system", correct: false }
      ]
    },
    {
      question: "What powers Io's extreme volcanic activity?",
      options: [
        { text: "Radioactive decay", correct: false },
        { text: "Solar heating", correct: false },
        { text: "Tidal heating from Jupiter's gravity", correct: true },
        { text: "Chemical reactions", correct: false }
      ]
    },
    {
      question: "Before tidal locking, a moon typically rotates:",
      options: [
        { text: "Slower than its orbital period", correct: false },
        { text: "Faster than its orbital period", correct: true },
        { text: "At exactly its orbital period", correct: false },
        { text: "In the opposite direction", correct: false }
      ]
    },
    {
      question: "The 'far side' of the Moon:",
      options: [
        { text: "Is always dark", correct: false },
        { text: "Was first photographed from space", correct: true },
        { text: "Doesn't exist", correct: false },
        { text: "Faces the Sun constantly", correct: false }
      ]
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  const renderMoonSystem = (locked: boolean, showBulge: boolean, orbAngle: number, moonRot: number, size: number = 300) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const orbitRadius = 100;
    const moonX = centerX + Math.cos(orbAngle * Math.PI / 180) * orbitRadius;
    const moonY = centerY + Math.sin(orbAngle * Math.PI / 180) * orbitRadius;

    // Angle from Moon to Earth (for tidal bulge direction)
    const angleToEarth = Math.atan2(centerY - moonY, centerX - moonX);

    return (
      <svg width={size} height={size} className="overflow-visible">
        {/* Stars background */}
        {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
          <circle key={i} cx={(i * 31) % size} cy={(i * 23) % size} r="1" fill="white" opacity="0.4" />
        ))}

        {/* Orbit path */}
        <circle cx={centerX} cy={centerY} r={orbitRadius} fill="none" stroke="rgba(100, 116, 139, 0.3)" strokeWidth="1" strokeDasharray="4 2" />

        {/* Earth */}
        <circle cx={centerX} cy={centerY} r="35" fill="url(#earthGrad)" />
        <ellipse cx={centerX} cy={centerY} rx="35" ry="10" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.3" />
        {/* Earth continents hint */}
        <ellipse cx={centerX - 10} cy={centerY - 5} rx="12" ry="8" fill="#22c55e" opacity="0.5" />
        <ellipse cx={centerX + 8} cy={centerY + 8} rx="8" ry="5" fill="#22c55e" opacity="0.4" />

        {/* Moon */}
        <g transform={`translate(${moonX}, ${moonY})`}>
          {/* Tidal bulge - elongated toward Earth */}
          {showBulge && (
            <ellipse
              cx="0" cy="0"
              rx="28" ry="22"
              fill="url(#moonGrad)"
              transform={`rotate(${angleToEarth * 180 / Math.PI})`}
            />
          )}
          {!showBulge && (
            <circle cx="0" cy="0" r="25" fill="url(#moonGrad)" />
          )}

          {/* Moon surface features (rotate with moon) */}
          <g transform={`rotate(${locked ? moonRot : moonRot})`}>
            {/* Face marker - always toward Earth if locked */}
            <circle cx="-8" cy="-5" r="4" fill="#4b5563" opacity="0.6" />
            <circle cx="6" cy="-3" r="3" fill="#4b5563" opacity="0.5" />
            <circle cx="0" cy="8" r="5" fill="#4b5563" opacity="0.6" />
            {/* "Near side" indicator */}
            <circle cx="0" cy="-12" r="3" fill="#fbbf24" />
          </g>
        </g>

        {/* Arrow from Moon to Earth showing tidal force direction */}
        {showBulge && (
          <line
            x1={moonX + Math.cos(angleToEarth) * 30}
            y1={moonY + Math.sin(angleToEarth) * 30}
            x2={moonX + Math.cos(angleToEarth) * 50}
            y2={moonY + Math.sin(angleToEarth) * 50}
            stroke="#f59e0b"
            strokeWidth="2"
            markerEnd="url(#arrowOrange)"
            opacity="0.7"
          />
        )}

        {/* Observer on Earth */}
        <circle cx={centerX + 25} cy={centerY - 20} r="4" fill="#fcd9b6" />
        <line
          x1={centerX + 25} y1={centerY - 24}
          x2={moonX - (moonX - centerX - 25) * 0.3}
          y2={moonY - (moonY - centerY + 20) * 0.3}
          stroke="#94a3b8"
          strokeWidth="1"
          strokeDasharray="3 2"
          opacity="0.5"
        />

        <defs>
          <radialGradient id="earthGrad" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#1e40af" />
          </radialGradient>
          <radialGradient id="moonGrad" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#d1d5db" />
            <stop offset="100%" stopColor="#6b7280" />
          </radialGradient>
          <marker id="arrowOrange" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#f59e0b" />
          </marker>
        </defs>
      </svg>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      {/* Premium Badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-cyan-400/80 text-sm font-medium tracking-wide uppercase">Orbital Mechanics</span>
      </div>

      {/* Gradient Title */}
      <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white via-cyan-100 to-slate-300 bg-clip-text text-transparent">
        The Moon&apos;s Hidden Side
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg mb-8">
        A mystery hiding in plain sight for all of human history
      </p>

      {/* Premium Card */}
      <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-8 max-w-2xl border border-slate-700/50 shadow-2xl">
        {renderMoonSystem(isTidallyLocked, true, orbitalAngle, moonRotation, 280)}
        <p className="text-xl text-slate-300 mt-6 mb-4">
          Throughout human history, we&apos;ve only ever seen one face of the Moon. The &quot;far side&quot; remained a complete mystery until spacecraft photographed it in 1959.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          Why does the Moon always show us the same face? Is it just a cosmic coincidence?
        </p>
      </div>

      {/* Premium CTA Button */}
      <button
        onClick={() => goToPhase('predict')}
        style={{ zIndex: 10 }}
        className="group mt-8 px-8 py-4 bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-lg font-semibold rounded-2xl hover:from-cyan-500 hover:to-teal-500 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="flex items-center gap-2">
          Uncover the Mystery
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Subtle hint text */}
      <p className="text-slate-500 text-sm mt-4">
        Tap to begin your journey through tidal forces
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Why do we always see the same side of the Moon from Earth?
        </p>
        {renderMoonSystem(true, true, orbitalAngle, moonRotation, 200)}
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The Moon doesn\'t rotate at all - it just orbits' },
          { id: 'B', text: 'It\'s a pure coincidence that hasn\'t changed' },
          { id: 'C', text: 'The Moon rotates exactly once per orbit (tidal locking)' },
          { id: 'D', text: 'Earth\'s magnetic field holds the Moon in place' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            style={{ zIndex: 10 }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
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
            Correct! The Moon IS rotating, but exactly once per orbit. This is called <span className="text-cyan-400">tidal locking</span>!
          </p>
          <button
            onClick={() => goToPhase('play')}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-500 hover:to-slate-600 transition-all duration-300"
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Tidal Locking Lab</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderMoonSystem(isTidallyLocked, showTidalBulge, orbitalAngle, moonRotation, 280)}
        <p className="text-sm text-slate-400 mt-2 text-center">
          Yellow dot = marker on Moon's near side. Watch if it always faces Earth!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
        <button
          onClick={() => setIsTidallyLocked(!isTidallyLocked)}
          style={{ zIndex: 10 }}
          className={`p-4 rounded-xl transition-all ${
            isTidallyLocked
              ? 'bg-emerald-600/40 border-2 border-emerald-500'
              : 'bg-amber-600/40 border-2 border-amber-500'
          }`}
        >
          <div className="font-semibold text-white">
            {isTidallyLocked ? 'Tidally Locked' : 'Not Locked'}
          </div>
          <div className="text-sm text-slate-300">
            {isTidallyLocked
              ? 'Rotation = orbital period'
              : 'Rotation faster than orbit'}
          </div>
        </button>

        <button
          onClick={() => setShowTidalBulge(!showTidalBulge)}
          style={{ zIndex: 10 }}
          className={`p-4 rounded-xl transition-all ${
            showTidalBulge
              ? 'bg-cyan-600/40 border-2 border-cyan-500'
              : 'bg-slate-700/50 border-2 border-transparent'
          }`}
        >
          <div className="font-semibold text-white">
            {showTidalBulge ? 'Tidal Bulge: ON' : 'Tidal Bulge: OFF'}
          </div>
          <div className="text-sm text-slate-300">
            Moon stretched toward Earth
          </div>
        </button>
      </div>

      <div className="bg-slate-700/50 rounded-xl p-4 w-full max-w-2xl mb-6">
        <label className="text-slate-300 text-sm block mb-2">Time Speed: {timeScale}x</label>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.5"
          value={timeScale}
          onChange={(e) => setTimeScale(parseFloat(e.target.value))}
          className="w-full accent-slate-500"
        />
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setIsAnimating(!isAnimating)}
          style={{ zIndex: 10 }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isAnimating ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
          } text-white`}
        >
          {isAnimating ? 'Pause' : 'Play'}
        </button>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-2">Observe:</h3>
        <p className="text-slate-300 text-sm">
          When locked: The yellow marker always points toward Earth - even though the Moon IS rotating!
          <br /><br />
          When unlocked: Different parts of the Moon become visible as it rotates faster than it orbits.
        </p>
      </div>

      <button
        onClick={() => goToPhase('review')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-500 hover:to-slate-600 transition-all duration-300"
      >
        Review the Concepts
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Tidal Locking</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">Tidal Forces</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>Gravity is stronger on the near side, weaker on the far side</li>
            <li>This difference stretches the body into an oval (tidal bulge)</li>
            <li>The bulge always points toward the larger body</li>
            <li>If the body rotates, the bulge must "move" through the rock</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">Tidal Friction</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>Moving the bulge through rock creates friction</li>
            <li>Friction converts rotational energy to heat</li>
            <li>The body gradually slows its rotation</li>
            <li>Eventually, rotation matches the orbital period</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">The Locked State</h3>
          <div className="text-slate-300 text-sm space-y-2">
            <p><strong>Synchronous Rotation:</strong> When rotation period = orbital period</p>
            <p><strong>Stable Configuration:</strong> The tidal bulge stays fixed - no more friction, no more energy loss</p>
            <p><strong>One Face Visible:</strong> The same hemisphere always faces the parent body</p>
            <p className="text-cyan-400 mt-3">
              The Moon became tidally locked about 4 billion years ago. It now rotates exactly once every 27.3 days - the same as its orbital period!
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

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          The Moon raises tides on Earth too - that's where our ocean tides come from! These tides create friction as they slosh against continents and the seafloor.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What does this mean for Earth's future?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Earth will eventually spin faster' },
          { id: 'B', text: 'Earth\'s day is gradually getting longer' },
          { id: 'C', text: 'Earth\'s rotation is unaffected by the Moon' },
          { id: 'D', text: 'Earth will stop rotating completely' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            style={{ zIndex: 10 }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
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
            Correct! Earth's day gets about 1.4 milliseconds longer each century!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Billions of years from now, Earth could become tidally locked to the Moon - a day would equal a month!
          </p>
          <button
            onClick={() => goToPhase('twist_play')}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
          >
            See the Evidence
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Moons of the Solar System</h2>
      <p className="text-slate-300 mb-6 text-center max-w-2xl">
        Compare different moons and see how tidal locking affects them differently based on their distance and size.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-4xl">
        {/* Our Moon */}
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2 text-center">Our Moon</h3>
          <svg width="180" height="120" className="mx-auto">
            <circle cx="60" cy="60" r="25" fill="url(#earthGrad)" />
            <ellipse cx="60" cy="60" rx="50" ry="15" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
            <g transform={`translate(${60 + Math.cos(orbitalAngle * Math.PI / 180) * 50}, ${60 + Math.sin(orbitalAngle * Math.PI / 180) * 15})`}>
              <circle cx="0" cy="0" r="8" fill="#9ca3af" />
              <circle cx="-2" cy="-2" r="2" fill="#6b7280" />
            </g>
            <defs>
              <radialGradient id="earthGrad" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#1e40af" />
              </radialGradient>
            </defs>
          </svg>
          <div className="text-center mt-2">
            <p className="text-sm text-emerald-400 font-medium">Tidally Locked</p>
            <p className="text-xs text-slate-400">27.3 day rotation = 27.3 day orbit</p>
          </div>
        </div>

        {/* Io */}
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-amber-400 mb-2 text-center">Io (Jupiter)</h3>
          <svg width="180" height="120" className="mx-auto">
            <circle cx="50" cy="60" r="30" fill="#c2956e" />
            <ellipse cx="50" cy="60" rx="30" ry="8" fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.5" />
            <ellipse cx="100" cy="60" rx="45" ry="15" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
            <g transform={`translate(${100 + Math.cos(orbitalAngle * 2 * Math.PI / 180) * 45}, ${60 + Math.sin(orbitalAngle * 2 * Math.PI / 180) * 15})`}>
              <circle cx="0" cy="0" r="8" fill="#fde047" />
              <circle cx="-2" cy="-2" r="2" fill="#ef4444" />
              <path d="M-2,-4 L-3,-10 L-1,-8 L-2,-4" fill="#ef4444" opacity="0.8" />
            </g>
          </svg>
          <div className="text-center mt-2">
            <p className="text-sm text-emerald-400 font-medium">Tidally Locked + Heated</p>
            <p className="text-xs text-slate-400">Most volcanic body in solar system</p>
          </div>
        </div>

        {/* Europa */}
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-blue-400 mb-2 text-center">Europa (Jupiter)</h3>
          <svg width="180" height="120" className="mx-auto">
            <circle cx="50" cy="60" r="30" fill="#c2956e" />
            <ellipse cx="100" cy="60" rx="50" ry="18" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
            <g transform={`translate(${100 + Math.cos((orbitalAngle * 1.5) * Math.PI / 180) * 50}, ${60 + Math.sin((orbitalAngle * 1.5) * Math.PI / 180) * 18})`}>
              <circle cx="0" cy="0" r="7" fill="#a5c4d4" />
              <line x1="-5" y1="-3" x2="5" y2="3" stroke="#6b7280" strokeWidth="0.5" />
              <line x1="-4" y1="2" x2="4" y2="-4" stroke="#6b7280" strokeWidth="0.5" />
            </g>
          </svg>
          <div className="text-center mt-2">
            <p className="text-sm text-emerald-400 font-medium">Tidally Locked</p>
            <p className="text-xs text-slate-400">Ice shell hides liquid ocean</p>
          </div>
        </div>

        {/* Titan */}
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-orange-400 mb-2 text-center">Titan (Saturn)</h3>
          <svg width="180" height="120" className="mx-auto">
            <circle cx="50" cy="60" r="25" fill="#e8d5b7" />
            <ellipse cx="50" cy="60" rx="35" ry="5" fill="none" stroke="#fbbf24" strokeWidth="2" />
            <ellipse cx="100" cy="60" rx="45" ry="15" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
            <g transform={`translate(${100 + Math.cos(orbitalAngle * Math.PI / 180) * 45}, ${60 + Math.sin(orbitalAngle * Math.PI / 180) * 15})`}>
              <circle cx="0" cy="0" r="10" fill="#f59e0b" opacity="0.8" />
              <circle cx="0" cy="0" r="8" fill="#d97706" />
            </g>
          </svg>
          <div className="text-center mt-2">
            <p className="text-sm text-emerald-400 font-medium">Tidally Locked</p>
            <p className="text-xs text-slate-400">Thick atmosphere, methane lakes</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-amber-400 mb-3">Key Insight:</h3>
        <p className="text-slate-300 text-sm">
          Almost all major moons in our solar system are tidally locked to their planets! The closer a moon orbits and the larger its planet, the faster tidal locking occurs. Io is so close to Jupiter that tidal forces flex it constantly, creating intense volcanic activity through tidal heating.
        </p>
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

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Key Discovery</h2>

      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-amber-400 mb-4">Factors Affecting Tidal Locking Time</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            The time required for a body to become tidally locked depends on several key factors:
          </p>
          <div className="grid gap-3 mt-4">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <h4 className="text-cyan-400 font-semibold">Distance</h4>
              <p className="text-sm">Closer objects lock faster. Tidal force decreases with the cube of distance.</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <h4 className="text-cyan-400 font-semibold">Mass Ratio</h4>
              <p className="text-sm">Larger primary body = stronger tidal forces = faster locking.</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <h4 className="text-cyan-400 font-semibold">Rigidity</h4>
              <p className="text-sm">Less rigid bodies (more liquid/icy) dissipate energy faster and lock sooner.</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <h4 className="text-cyan-400 font-semibold">Initial Spin</h4>
              <p className="text-sm">Bodies that start spinning faster take longer to slow down to locked state.</p>
            </div>
          </div>
          <p className="text-emerald-400 font-medium mt-4">
            Most moons in our solar system are tidally locked to their planets!
          </p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-500 hover:to-slate-600 transition-all duration-300"
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  const applications = [
    {
      title: "Earth-Moon System",
      icon: "Moon",
      description: "The Moon is tidally locked to Earth, always showing the same face. Earth's rotation is also gradually slowing.",
      details: "The 'far side' of the Moon was a complete mystery until Luna 3 photographed it in 1959. It looks surprisingly different - more craters, fewer dark 'mare' regions.",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          {/* Stars */}
          {[1,2,3,4,5,6,7,8].map(i => (
            <circle key={i} cx={15 + (i * 23)} cy={10 + (i % 4) * 15} r="1" fill="white" opacity="0.5" />
          ))}
          {/* Earth */}
          <circle cx="70" cy="75" r="30" fill="url(#earthGradApp)" />
          {/* Moon orbit */}
          <ellipse cx="70" cy="75" rx="60" ry="20" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
          {/* Moon */}
          <g transform={`translate(${70 + Math.cos(orbitalAngle * Math.PI / 180) * 60}, ${75 + Math.sin(orbitalAngle * Math.PI / 180) * 20})`}>
            <circle cx="0" cy="0" r="10" fill="#9ca3af" />
            <circle cx="-3" cy="-2" r="2" fill="#6b7280" />
          </g>
          <text x="100" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">Same face always visible</text>
          <defs>
            <radialGradient id="earthGradApp" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#1e40af" />
            </radialGradient>
          </defs>
        </svg>
      )
    },
    {
      title: "Mercury's Resonance",
      icon: "Mercury",
      description: "Mercury isn't fully tidally locked - it's in a 3:2 spin-orbit resonance with the Sun.",
      details: "Mercury rotates 3 times for every 2 orbits around the Sun. This unusual resonance was caused by Mercury's eccentric orbit preventing full tidal locking.",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          {/* Sun */}
          <circle cx="50" cy="75" r="30" fill="#fbbf24" />
          <circle cx="50" cy="75" r="35" fill="#fbbf24" opacity="0.3" />
          {/* Mercury orbit (eccentric) */}
          <ellipse cx="100" cy="75" rx="70" ry="40" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
          {/* Mercury */}
          <g transform={`translate(${100 + Math.cos(orbitalAngle * Math.PI / 180) * 70}, ${75 + Math.sin(orbitalAngle * Math.PI / 180) * 40})`}>
            <circle cx="0" cy="0" r="8" fill="#9ca3af" />
            <circle cx="-2" cy="-2" r="2" fill="#6b7280" />
          </g>
          <text x="100" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">3:2 spin-orbit resonance</text>
        </svg>
      )
    },
    {
      title: "Exoplanet Habitability",
      icon: "Exoplanets",
      description: "Many exoplanets orbiting red dwarf stars may be tidally locked, creating 'eyeball worlds'.",
      details: "With a permanent day side and night side, these worlds could have habitable zones in the 'terminator ring' between extreme heat and cold.",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          {/* Red dwarf star */}
          <circle cx="30" cy="75" r="25" fill="#ef4444" opacity="0.8" />
          {/* Heat rays */}
          {[0, 1, 2].map(i => (
            <line key={i} x1="55" y1={65 + i * 10} x2="90" y2={65 + i * 10} stroke="#fbbf24" strokeWidth="2" opacity="0.4" />
          ))}
          {/* Eyeball planet */}
          <circle cx="130" cy="75" r="35" fill="#1e3a5f" />
          {/* Day side (hot) */}
          <path d="M130,40 A35,35 0 0 0 130,110" fill="#ef4444" opacity="0.6" />
          {/* Eye/habitable zone */}
          <ellipse cx="115" cy="75" rx="8" ry="20" fill="#22c55e" opacity="0.7" />
          <circle cx="115" cy="75" r="5" fill="#3b82f6" />
          <text x="130" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">Habitable terminator ring</text>
        </svg>
      )
    },
    {
      title: "Binary Stars",
      icon: "Binary Stars",
      description: "Close binary star systems can become mutually tidally locked, like Pluto and Charon.",
      details: "In these systems, both stars always show the same face to each other. The orbital period equals both rotation periods, creating a cosmic dance.",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          {/* Barycenter */}
          <circle cx="100" cy="75" r="2" fill="#f59e0b" />
          {/* Binary stars */}
          <g transform={`rotate(${orbitalAngle}, 100, 75)`}>
            {/* Star 1 */}
            <circle cx="55" cy="75" r="20" fill="#fbbf24" />
            <circle cx="55" cy="75" r="25" fill="#fbbf24" opacity="0.2" />
            {/* Star 2 */}
            <circle cx="145" cy="75" r="15" fill="#f97316" />
            <circle cx="145" cy="75" r="20" fill="#f97316" opacity="0.2" />
          </g>
          <text x="100" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">Mutually tidally locked</text>
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
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index
                ? 'bg-slate-600 text-white'
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon}
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
          className="mt-6 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-500 hover:to-slate-600 transition-all duration-300"
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
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-slate-600 text-white'
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
              setShowTestResults(true);
              const score = calculateScore();
              onGameEvent?.({ type: 'test_completed', data: { score, total: 10 } });
            }}
            style={{ zIndex: 10 }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:from-slate-500 hover:to-slate-600'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <h3 className="text-2xl font-bold text-white mb-2">
            Score: {calculateScore()}/10
          </h3>
          <p className="text-slate-300 mb-6">
            {calculateScore() >= 7
              ? 'Excellent! You\'ve mastered tidal locking and orbital mechanics!'
              : 'Keep studying! Review the concepts and try again.'}
          </p>

          {calculateScore() >= 7 ? (
            <button
              onClick={() => {
                goToPhase('mastery');
                onGameEvent?.({ type: 'mastery_achieved', data: { score: calculateScore() } });
              }}
              style={{ zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onClick={() => { setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase('review'); }}
              style={{ zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-500 hover:to-slate-600 transition-all duration-300"
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
      <div className="bg-gradient-to-br from-slate-800/50 via-slate-700/50 to-slate-800/50 rounded-3xl p-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-white mb-4">Congratulations!</h1>
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Tidal Locking Master!</h2>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the physics of tidal locking and orbital resonance!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <p className="text-sm text-slate-300">Tidal Forces</p>
            <p className="text-xs text-slate-500 mt-1">Differential gravity creates bulges</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <p className="text-sm text-slate-300">Synchronous Rotation</p>
            <p className="text-xs text-slate-500 mt-1">Rotation = Orbital period</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <p className="text-sm text-slate-300">Tidal Heating</p>
            <p className="text-xs text-slate-500 mt-1">Powers Io's volcanoes</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <p className="text-sm text-slate-300">Eyeball Worlds</p>
            <p className="text-xs text-slate-500 mt-1">Locked exoplanets</p>
          </div>
        </div>

        <div className="bg-emerald-900/30 rounded-xl p-4 mb-6">
          <p className="text-emerald-400 font-medium">You have demonstrated mastery of:</p>
          <ul className="text-sm text-slate-300 mt-2 space-y-1">
            <li>Understanding why the Moon shows one face</li>
            <li>How tidal forces lead to synchronous rotation</li>
            <li>Effects on moons throughout the solar system</li>
            <li>Implications for exoplanet habitability</li>
          </ul>
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
    <div className="min-h-screen bg-[#0a0f1a] relative overflow-hidden">
      {/* Premium gradient background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/30 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent" />

      {/* Ambient glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-500/5 rounded-full blur-3xl" />

      {/* Premium Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-slate-400">Tidal Locking</span>
          <div className="flex gap-1.5">
            {phaseOrder.map((p, index) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p ? 'bg-cyan-400 w-6' : currentPhaseIndex > index ? 'bg-cyan-500 w-2' : 'bg-slate-600 w-2'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm text-slate-500">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 pt-16 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default TidalLockingRenderer;
