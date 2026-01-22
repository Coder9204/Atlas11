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

const TidalLockingRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
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
  const [orbitalAngle, setOrbitalAngle] = useState(0);
  const [moonRotation, setMoonRotation] = useState(0);
  const [isTidallyLocked, setIsTidallyLocked] = useState(true);
  const [showTidalBulge, setShowTidalBulge] = useState(true);
  const [timeScale, setTimeScale] = useState(1);
  const [isAnimating, setIsAnimating] = useState(true);

  const navigationLockRef = useRef(false);
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
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

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

  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
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
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'B' ? 'correct' : 'incorrect');
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
      question: "What causes tidal locking to occur?",
      options: ["Magnetic attraction", "Tidal friction dissipating rotational energy", "Solar radiation", "The satellite's composition"],
      correct: 1
    },
    {
      question: "When a body is tidally locked, its rotation period equals its:",
      options: ["Day length of the parent body", "Orbital period", "Parent body's rotation period", "None - it stops rotating"],
      correct: 1
    },
    {
      question: "The Moon's rotation period is approximately:",
      options: ["1 day", "1 week", "27.3 days (same as its orbital period)", "365 days"],
      correct: 2
    },
    {
      question: "Tidal bulges on a body are caused by:",
      options: ["Internal heat", "Differential gravitational pull across the body", "Magnetic fields", "Solar wind"],
      correct: 1
    },
    {
      question: "Which statement about the Earth-Moon system is true?",
      options: ["Earth is already tidally locked to the Moon", "The Moon is moving closer to Earth", "Earth's rotation is gradually slowing", "Tidal locking cannot happen to Earth"],
      correct: 2
    },
    {
      question: "Pluto and Charon are special because:",
      options: ["Neither is tidally locked", "They are mutually tidally locked", "Only Charon is tidally locked", "They orbit the Sun together"],
      correct: 1
    },
    {
      question: "An 'eyeball world' refers to a tidally locked exoplanet with:",
      options: ["Unusual coloring", "A permanent day side and night side", "Multiple moons", "A ring system"],
      correct: 1
    },
    {
      question: "What powers Io's extreme volcanic activity?",
      options: ["Radioactive decay", "Solar heating", "Tidal heating from Jupiter's gravity", "Chemical reactions"],
      correct: 2
    },
    {
      question: "Before tidal locking, a moon typically rotates:",
      options: ["Slower than its orbital period", "Faster than its orbital period", "At exactly its orbital period", "In the opposite direction"],
      correct: 1
    },
    {
      question: "The 'far side' of the Moon:",
      options: ["Is always dark", "Was first photographed from space", "Doesn't exist", "Faces the Sun constantly"],
      correct: 1
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (answer === testQuestions[index].correct ? 1 : 0);
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
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
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
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
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
            ✓ Correct! The Moon IS rotating, but exactly once per orbit. This is called <span className="text-cyan-400">tidal locking</span>!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-500 hover:to-slate-600 transition-all duration-300"
          >
            Explore the Physics →
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
          onMouseDown={(e) => { e.preventDefault(); setIsTidallyLocked(!isTidallyLocked); }}
          className={`p-4 rounded-xl transition-all ${
            isTidallyLocked
              ? 'bg-emerald-600/40 border-2 border-emerald-500'
              : 'bg-amber-600/40 border-2 border-amber-500'
          }`}
        >
          <div className="font-semibold text-white">
            {isTidallyLocked ? '🔒 Tidally Locked' : '🔓 Not Locked'}
          </div>
          <div className="text-sm text-slate-300">
            {isTidallyLocked
              ? 'Rotation = orbital period'
              : 'Rotation faster than orbit'}
          </div>
        </button>

        <button
          onMouseDown={(e) => { e.preventDefault(); setShowTidalBulge(!showTidalBulge); }}
          className={`p-4 rounded-xl transition-all ${
            showTidalBulge
              ? 'bg-cyan-600/40 border-2 border-cyan-500'
              : 'bg-slate-700/50 border-2 border-transparent'
          }`}
        >
          <div className="font-semibold text-white">
            {showTidalBulge ? '🌊 Tidal Bulge: ON' : '🌊 Tidal Bulge: OFF'}
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
          onMouseDown={(e) => { e.preventDefault(); setIsAnimating(!isAnimating); }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isAnimating ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
          } text-white`}
        >
          {isAnimating ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-2">Observe:</h3>
        <p className="text-slate-300 text-sm">
          When locked: The yellow marker always points toward Earth—even though the Moon IS rotating!
          <br /><br />
          When unlocked: Different parts of the Moon become visible as it rotates faster than it orbits.
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-500 hover:to-slate-600 transition-all duration-300"
      >
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Tidal Locking</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">🌊 Tidal Forces</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Gravity is stronger on the near side, weaker on the far side</li>
            <li>• This difference stretches the body into an oval (tidal bulge)</li>
            <li>• The bulge always points toward the larger body</li>
            <li>• If the body rotates, the bulge must "move" through the rock</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">🔥 Tidal Friction</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Moving the bulge through rock creates friction</li>
            <li>• Friction converts rotational energy to heat</li>
            <li>• The body gradually slows its rotation</li>
            <li>• Eventually, rotation matches the orbital period</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">🔒 The Locked State</h3>
          <div className="text-slate-300 text-sm space-y-2">
            <p><strong>Synchronous Rotation:</strong> When rotation period = orbital period</p>
            <p><strong>Stable Configuration:</strong> The tidal bulge stays fixed—no more friction, no more energy loss</p>
            <p><strong>One Face Visible:</strong> The same hemisphere always faces the parent body</p>
            <p className="text-cyan-400 mt-3">
              The Moon became tidally locked about 4 billion years ago. It now rotates exactly once every 27.3 days—the same as its orbital period!
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
          The Moon raises tides on Earth too—that's where our ocean tides come from! These tides create friction as they slosh against continents and the seafloor.
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
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
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
            ✓ Correct! Earth's day gets about 1.4 milliseconds longer each century!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Billions of years from now, Earth could become tidally locked to the Moon—a day would equal a month!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
          >
            See the Evidence →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Earth's Slowing Rotation</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-3xl">
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2 text-center">400 Million Years Ago</h3>
          <svg width="180" height="120" className="mx-auto">
            <circle cx="90" cy="60" r="40" fill="url(#earthGrad)" />
            <text x="90" y="100" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="bold">~22 hour day</text>
            <text x="90" y="115" textAnchor="middle" fill="#94a3b8" fontSize="10">~400 days/year</text>
            {/* Fast rotation arrow */}
            <path d="M50,60 A40,40 0 0 1 130,60" fill="none" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrowGreen)" />
          </svg>
          <p className="text-sm text-slate-300 text-center mt-2">
            Coral growth rings confirm shorter days!
          </p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-amber-400 mb-2 text-center">Today</h3>
          <svg width="180" height="120" className="mx-auto">
            <circle cx="90" cy="60" r="40" fill="url(#earthGrad)" />
            <text x="90" y="100" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="bold">24 hour day</text>
            <text x="90" y="115" textAnchor="middle" fill="#94a3b8" fontSize="10">365 days/year</text>
            {/* Slower rotation arrow */}
            <path d="M60,60 A30,30 0 0 1 120,60" fill="none" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#arrowOrange)" />
          </svg>
          <p className="text-sm text-slate-300 text-center mt-2">
            Days are ~2 hours longer now!
          </p>
        </div>
        <defs>
          <marker id="arrowGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#10b981" />
          </marker>
        </defs>
      </div>

      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-amber-400 mb-3">The Evidence:</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• <strong>Coral fossils:</strong> Daily and yearly growth rings show ~400 days per year in the Devonian period</li>
          <li>• <strong>Tidal rhythmites:</strong> Ancient sediment layers record shorter days</li>
          <li>• <strong>Lunar laser ranging:</strong> The Moon moves 3.8 cm farther from Earth each year</li>
          <li>• <strong>Atomic clocks:</strong> Leap seconds are added because Earth's rotation is slowing</li>
        </ul>
        <p className="text-cyan-400 mt-4 font-medium">
          The same mechanism that locked the Moon is slowly working on Earth!
        </p>
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
        <h3 className="text-xl font-bold text-amber-400 mb-4">Tidal Locking Is Universal!</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            Any two bodies in close orbit will eventually become tidally locked. It's not a coincidence—it's physics!
          </p>
          <p>
            <span className="text-cyan-400 font-semibold">Time required depends on:</span>
          </p>
          <ul className="space-y-1 text-sm ml-4">
            <li>• Distance between the bodies (closer = faster)</li>
            <li>• Size difference (larger primary = faster)</li>
            <li>• Composition (liquid bodies lock faster)</li>
            <li>• Initial rotation rate</li>
          </ul>
          <p className="text-emerald-400 font-medium mt-4">
            Most moons in our solar system are tidally locked to their planets!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-500 hover:to-slate-600 transition-all duration-300"
      >
        Explore Real-World Applications →
      </button>
    </div>
  );

  const applications = [
    {
      title: "Earth-Moon System",
      icon: "🌍",
      description: "The Moon is tidally locked to Earth, always showing the same face. Earth's rotation is also gradually slowing.",
      details: "The 'far side' of the Moon was a complete mystery until Luna 3 photographed it in 1959. It looks surprisingly different—more craters, fewer dark 'mare' regions.",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          {/* Stars */}
          {[1,2,3,4,5,6,7,8].map(i => (
            <circle key={i} cx={15 + (i * 23)} cy={10 + (i % 4) * 15} r="1" fill="white" opacity="0.5" />
          ))}
          {/* Earth */}
          <circle cx="70" cy="75" r="30" fill="url(#earthGrad)" />
          {/* Moon orbit */}
          <ellipse cx="70" cy="75" rx="60" ry="20" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
          {/* Moon */}
          <g transform={`translate(${70 + Math.cos(orbitalAngle * Math.PI / 180) * 60}, ${75 + Math.sin(orbitalAngle * Math.PI / 180) * 20})`}>
            <circle cx="0" cy="0" r="10" fill="#9ca3af" />
            <circle cx="-3" cy="-2" r="2" fill="#6b7280" />
          </g>
          <text x="100" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">Same face always visible</text>
        </svg>
      )
    },
    {
      title: "Pluto-Charon",
      icon: "💫",
      description: "Pluto and Charon are mutually tidally locked—both always show the same face to each other!",
      details: "This is rare because Charon is so large relative to Pluto (about 1/8 Pluto's mass). They orbit a point between them, like a cosmic dumbbell spinning in space.",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          {/* Stars */}
          {[1,2,3,4,5,6,7,8,9,10].map(i => (
            <circle key={i} cx={10 + (i * 19)} cy={5 + (i % 5) * 12} r="1" fill="white" opacity="0.4" />
          ))}
          {/* Barycenter */}
          <circle cx="100" cy="75" r="2" fill="#f59e0b" />
          {/* Pluto */}
          <g transform={`rotate(${orbitalAngle}, 100, 75)`}>
            <circle cx="60" cy="75" r="18" fill="#e8c4a0" />
            <circle cx="56" cy="72" r="4" fill="#d1a376" opacity="0.6" />
            {/* Charon */}
            <circle cx="140" cy="75" r="10" fill="#9ca3af" />
          </g>
          <text x="100" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">Mutually tidally locked</text>
        </svg>
      )
    },
    {
      title: "Eyeball Worlds",
      icon: "👁️",
      description: "Tidally locked exoplanets around red dwarfs have a permanent day side and night side—creating 'eyeball' worlds.",
      details: "The day side could be too hot, the night side frozen solid. Life might exist in a 'terminator ring' between the two extremes, where temperatures are moderate.",
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
          {/* Eye/habitabel zone */}
          <ellipse cx="115" cy="75" rx="8" ry="20" fill="#22c55e" opacity="0.7" />
          <circle cx="115" cy="75" r="5" fill="#3b82f6" />
          <text x="130" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">Habitable terminator ring</text>
        </svg>
      )
    },
    {
      title: "Io's Volcanism",
      icon: "🌋",
      description: "Jupiter's moon Io is the most volcanically active body in the solar system—powered by tidal heating!",
      details: "Io is tidally locked to Jupiter, but other moons perturb its orbit. This causes its distance from Jupiter to vary, flexing Io like a stress ball and generating enormous internal heat.",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          {/* Jupiter */}
          <circle cx="30" cy="75" r="35" fill="url(#jupiterGrad)" />
          <ellipse cx="30" cy="75" rx="35" ry="8" fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.5" />
          {/* Io's orbit (exaggerated ellipse) */}
          <ellipse cx="120" cy="75" rx="40" ry="20" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
          {/* Io */}
          <g transform={`translate(${120 + Math.cos(orbitalAngle * 2 * Math.PI / 180) * 40}, ${75 + Math.sin(orbitalAngle * 2 * Math.PI / 180) * 20})`}>
            <circle cx="0" cy="0" r="12" fill="#fde047" />
            {/* Volcanoes */}
            <circle cx="-4" cy="-4" r="3" fill="#ef4444" />
            <circle cx="3" cy="2" r="2" fill="#f97316" />
            {/* Eruption */}
            <path d="M-4,-7 L-6,-15 L-2,-12 L-4,-7" fill="#ef4444" opacity="0.8" />
          </g>
          <defs>
            <linearGradient id="jupiterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c2956e" />
              <stop offset="50%" stopColor="#e8d5b7" />
              <stop offset="100%" stopColor="#c2956e" />
            </linearGradient>
          </defs>
          <text x="100" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">Tidal heating powers volcanoes</text>
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
                ? 'bg-slate-600 text-white'
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
          className="mt-6 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-500 hover:to-slate-600 transition-all duration-300"
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
                        ? 'bg-slate-600 text-white'
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
                : 'bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:from-slate-500 hover:to-slate-600'
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
              ? 'Excellent! You\'ve mastered tidal locking and orbital mechanics!'
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
              className="px-8 py-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold rounded-xl hover:from-slate-500 hover:to-slate-600 transition-all duration-300"
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
      <div className="bg-gradient-to-br from-slate-800/50 via-slate-700/50 to-slate-800/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🌙</div>
        <h1 className="text-3xl font-bold text-white mb-4">Tidal Locking Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the physics of tidal locking and orbital resonance!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🌊</div>
            <p className="text-sm text-slate-300">Tidal Forces</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔒</div>
            <p className="text-sm text-slate-300">Synchronous Rotation</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🌋</div>
            <p className="text-sm text-slate-300">Tidal Heating</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">👁️</div>
            <p className="text-sm text-slate-300">Eyeball Worlds</p>
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
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p ? 'bg-cyan-400 w-6' : phase > p ? 'bg-cyan-500 w-2' : 'bg-slate-600 w-2'
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
