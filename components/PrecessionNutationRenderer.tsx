'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// PRECESSION & NUTATION - Premium 10-Phase Learning Experience
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
}

const PrecessionNutationRenderer: React.FC<Props> = ({ onGameEvent, gamePhase }) => {
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
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // Animation states
  const [topAngle, setTopAngle] = useState(0);
  const [precessionAngle, setPrecessionAngle] = useState(0);
  const [nutationPhase, setNutationPhase] = useState(0);
  const [spinSpeed, setSpinSpeed] = useState(5);
  const [tiltAngle, setTiltAngle] = useState(20);
  const [showVectors, setShowVectors] = useState(true);
  const [isSpinning, setIsSpinning] = useState(true);
  const [hasGravity, setHasGravity] = useState(true);

  // Earth visualization states
  const [earthPrecessionAngle, setEarthPrecessionAngle] = useState(0);

  // Mobile detection
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

  // Phase sync with external control
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Reset test on entry
  useEffect(() => {
    if (phase === 'test') {
      setCurrentQuestion(0);
      setTestAnswers(Array(10).fill(-1));
      setTestScore(0);
      setShowTestResults(false);
    }
  }, [phase]);

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

  const emit = useCallback((type: string, details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      type,
      gameType: 'precession_nutation',
      gameTitle: 'Precession & Nutation',
      details: { phase, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase]);

  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    emit('phase_changed', { to: newPhase });
  }, [playSound, emit]);

  // Top animation
  useEffect(() => {
    if (!isSpinning) return;

    const interval = setInterval(() => {
      setTopAngle(prev => (prev + spinSpeed) % 360);

      if (hasGravity && tiltAngle > 0) {
        const precessionRate = 0.3 * (tiltAngle / 20) / (spinSpeed / 5);
        setPrecessionAngle(prev => (prev + precessionRate) % 360);
        setNutationPhase(prev => (prev + 0.15) % (2 * Math.PI));
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isSpinning, spinSpeed, tiltAngle, hasGravity]);

  // Earth precession animation
  useEffect(() => {
    if (phase === 'twist_play') {
      const interval = setInterval(() => {
        setEarthPrecessionAngle(prev => (prev + 0.5) % 360);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const handlePrediction = useCallback((prediction: string) => {
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
    emit('prediction_made', { prediction, correct: prediction === 'B' });
  }, [playSound, emit]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'success' : 'failure');
    emit('twist_prediction_made', { prediction, correct: prediction === 'C' });
  }, [playSound, emit]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    emit('test_answered', { question: questionIndex, answer: answerIndex });
  }, [emit]);

  const handleAppComplete = useCallback((appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    emit('app_explored', { app: appIndex });
  }, [playSound, emit]);

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

  const calculateScore = useCallback(() => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  }, [testAnswers]);

  const renderTop = (showLabels: boolean = true, size: number = 200) => {
    const nutationOffset = hasGravity ? Math.sin(nutationPhase) * 2 : 0;
    const effectiveTilt = hasGravity ? tiltAngle + nutationOffset : 0;
    const centerX = size / 2;
    const centerY = size / 2;

    return (
      <svg width={size} height={size} className="overflow-visible">
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

        <g transform={`rotate(${effectiveTilt}, ${centerX}, ${centerY + 40})`}>
          <g transform={`translate(${centerX}, ${centerY})`}>
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

            <polygon
              points="0,40 -25,-5 25,-5"
              fill="url(#coneGradient)"
            />

            <rect x="-6" y="-30" width="12" height="25" rx="3" fill="url(#handleGradient)" />
            <circle cx="0" cy="-30" r="8" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
          </g>

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
              >t</text>
            )}
          </g>
        )}

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

  // ============================================================================
  // PHASE: HOOK - Welcome page explaining precession and nutation
  // ============================================================================
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-indigo-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
        Precession & Nutation
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover the fascinating physics behind spinning tops, gyroscopes, and even our planet Earth
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 rounded-3xl" />

        <div className="relative">
          {renderTop(false, 220)}

          <div className="mt-8 space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Have you ever wondered why a spinning top doesn't fall over?
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              Instead of toppling, its axis slowly traces a circle in the air - this is called <span className="text-indigo-400 font-semibold">precession</span>.
              The subtle wobbling motion superimposed on this is <span className="text-cyan-400 font-semibold">nutation</span>.
            </p>
            <div className="pt-2">
              <p className="text-base text-indigo-400 font-semibold">
                These same principles govern spacecraft navigation and even Earth's axis over millennia!
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('predict')}
        style={{ zIndex: 10 }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Begin Your Investigation
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-indigo-400">*</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-indigo-400">*</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-indigo-400">*</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // PHASE: PREDICT - Prediction question about spinning top behavior
  // ============================================================================
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
            Correct! This circular motion of the spin axis is called <span className="text-cyan-400">precession</span>.
          </p>
          <button
            onClick={() => goToPhase('play')}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all duration-300"
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // PHASE: PLAY - Interactive gyroscope/top simulation showing precession
  // ============================================================================
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
          <label className="text-slate-300 text-sm block mb-2">Tilt Angle: {tiltAngle} degrees</label>
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
          onClick={() => setIsSpinning(!isSpinning)}
          style={{ zIndex: 10 }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isSpinning ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
          } text-white`}
        >
          {isSpinning ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={() => setShowVectors(!showVectors)}
          style={{ zIndex: 10 }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showVectors ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-600 hover:bg-slate-500'
          } text-white`}
        >
          {showVectors ? 'Vectors On' : 'Vectors Off'}
        </button>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-2">Key Insight:</h3>
        <p className="text-slate-300 text-sm">
          <span className="text-emerald-400 font-semibold">L</span> = Angular momentum (green) points along the spin axis.
          Gravity creates a <span className="text-amber-400 font-semibold">torque</span> (orange) perpendicular to L.
          This torque doesn't make the top fall - it changes the <em>direction</em> of L, causing precession!
        </p>
      </div>

      <button
        onClick={() => goToPhase('review')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all duration-300"
      >
        Review the Concepts
      </button>
    </div>
  );

  // ============================================================================
  // PHASE: REVIEW - Explain torque causing change in angular momentum direction
  // ============================================================================
  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Precession & Nutation</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-indigo-400 mb-3">Precession</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>The slow rotation of the spin axis around the vertical</li>
            <li>Caused by gravity's torque on tilted angular momentum</li>
            <li>Faster spin leads to slower precession rate</li>
            <li>Greater tilt leads to faster precession rate</li>
            <li>Torque = dL/dt causes L to change direction, not magnitude</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">Nutation</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>A wobbling motion superimposed on precession</li>
            <li>The axis "nods" up and down while precessing</li>
            <li>Results from initial conditions when released</li>
            <li>Eventually damps out due to friction</li>
            <li>Creates a wavy or loopy path for the axis</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">The Physics</h3>
          <div className="text-slate-300 text-sm space-y-2">
            <p><strong>Angular Momentum:</strong> L = I * omega (moment of inertia times angular velocity)</p>
            <p><strong>Torque:</strong> tau = r x F = r x mg (gravity acting on center of mass)</p>
            <p><strong>Precession Rate:</strong> Omega = mgr / (I * omega) - inversely proportional to spin speed!</p>
            <p className="text-cyan-400 mt-3">
              The faster you spin, the more "gyroscopic rigidity" resists changes, resulting in slower precession.
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
  // PHASE: TWIST_PREDICT - Scenario about Earth's precession
  // ============================================================================
  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Earth's axis is tilted at 23.5 degrees. The Sun and Moon's gravity pull on Earth's equatorial bulge, creating a torque.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What effect does this have on Earth's axis over thousands of years?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The tilt angle increases until Earth flips over' },
          { id: 'B', text: 'Earth gradually stops rotating' },
          { id: 'C', text: 'Earth\'s axis precesses, changing the North Star over millennia' },
          { id: 'D', text: 'Earth\'s orbit becomes more elliptical' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            style={{ zIndex: 10 }}
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
            Exactly! Earth's axis precesses once every 26,000 years!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            This means Polaris won't always be our North Star - in 12,000 years it will be Vega!
          </p>
          <button
            onClick={() => goToPhase('twist_play')}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300"
          >
            See It in Action
          </button>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // PHASE: TWIST_PLAY - Interactive Earth axis wobble visualization
  // ============================================================================
  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Earth's Axial Precession</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
        <svg width="300" height="250" className="mx-auto">
          {/* Stars background */}
          {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(i => (
            <circle key={i} cx={10 + (i * 19) % 290} cy={10 + (i * 17) % 100} r="1.5" fill="white" opacity="0.6" />
          ))}

          {/* Precession circle path */}
          <ellipse cx="150" cy="50" rx="40" ry="12" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3" />

          {/* Current North Star position indicator */}
          <circle cx={150 + Math.cos(earthPrecessionAngle * Math.PI / 180) * 40} cy={50 + Math.sin(earthPrecessionAngle * Math.PI / 180) * 12} r="4" fill="#fbbf24" />
          <text x={150 + Math.cos(earthPrecessionAngle * Math.PI / 180) * 40 + 10} y={50 + Math.sin(earthPrecessionAngle * Math.PI / 180) * 12 - 5} fill="#fbbf24" fontSize="10">North Star</text>

          {/* Earth */}
          <g transform={`rotate(${Math.sin(earthPrecessionAngle * Math.PI / 180) * 5}, 150, 150)`}>
            <defs>
              <radialGradient id="earthGrad2" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1e40af" />
              </radialGradient>
            </defs>
            <circle cx="150" cy="150" r="50" fill="url(#earthGrad2)" />
            {/* Continents hint */}
            <ellipse cx="135" cy="140" rx="15" ry="20" fill="#22c55e" opacity="0.5" />
            <ellipse cx="170" cy="155" rx="12" ry="10" fill="#22c55e" opacity="0.5" />
            {/* Equator */}
            <ellipse cx="150" cy="150" rx="50" ry="15" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
            {/* Axis */}
            <line x1="150" y1="150" x2={150 + Math.sin(earthPrecessionAngle * Math.PI / 180) * 10} y2="70" stroke="#ef4444" strokeWidth="3" />
            <circle cx={150 + Math.sin(earthPrecessionAngle * Math.PI / 180) * 10} cy="70" r="5" fill="#ef4444" />
          </g>

          {/* Labels */}
          <text x="150" y="235" textAnchor="middle" fill="#94a3b8" fontSize="12">26,000 year precession cycle</text>
        </svg>
      </div>

      <div className="grid md:grid-cols-2 gap-4 max-w-2xl mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2">Current Era</h3>
          <p className="text-slate-300 text-sm">Polaris (North Star) aligns with Earth's axis. Ancient sailors used it for navigation.</p>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-amber-400 mb-2">In 12,000 Years</h3>
          <p className="text-slate-300 text-sm">Vega will be the new North Star. The constellations will appear in different seasonal positions.</p>
        </div>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-emerald-400 mb-2">Why It Matters:</h3>
        <p className="text-slate-300 text-sm">
          Earth's precession affects when equinoxes occur relative to Earth's orbit. This "precession of the equinoxes"
          slowly shifts seasonal timing over millennia and contributes to long-term climate cycles (Milankovitch cycles).
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

  // ============================================================================
  // PHASE: TWIST_REVIEW - Explain how precession affects seasons over millennia
  // ============================================================================
  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Key Discovery: Earth's Precession</h2>

      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-amber-400 mb-4">The 26,000-Year Wobble</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            <span className="text-cyan-400 font-semibold">Cause:</span> The Sun and Moon's gravity pull on Earth's equatorial bulge,
            creating a torque that causes our planet's axis to precess.
          </p>
          <p>
            <span className="text-purple-400 font-semibold">Effect on Stars:</span> The North Celestial Pole traces a circle among the stars.
            Different stars become the "North Star" at different points in the cycle.
          </p>
          <p>
            <span className="text-emerald-400 font-semibold">Effect on Seasons:</span> The timing of seasons relative to Earth's orbital position
            slowly shifts. This contributes to long-term climate patterns called Milankovitch cycles.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 max-w-3xl mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">3000 BCE</div>
          <p className="text-slate-400 text-sm">Thuban was the North Star when pyramids were built</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">Today</div>
          <p className="text-slate-400 text-sm">Polaris is our current North Star</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">14000 CE</div>
          <p className="text-slate-400 text-sm">Vega will be the North Star</p>
        </div>
      </div>

      <button
        onClick={() => { setHasGravity(true); goToPhase('transfer'); }}
        style={{ zIndex: 10 }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all duration-300"
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
      title: "Gyroscopes",
      icon: "Gyro",
      description: "Gyroscopes maintain orientation using angular momentum conservation. When the rotor spins, its axis resists change.",
      details: "Used in aircraft instruments, smartphones, and spacecraft attitude control. Control Moment Gyroscopes (CMGs) can rotate a spacecraft without using fuel - just by tilting their spinning rotors to transfer angular momentum.",
      keyPoint: "Faster spin = more resistance to orientation change"
    },
    {
      title: "Earth's Axis",
      icon: "Earth",
      description: "Earth's 23.5-degree tilt precesses once every 26,000 years due to gravitational torques from the Sun and Moon.",
      details: "This precession changes which star is our 'North Star' and affects long-term climate through Milankovitch cycles. Ancient astronomers noticed this 'precession of the equinoxes' over centuries.",
      keyPoint: "Currently Polaris, in 12,000 years it will be Vega"
    },
    {
      title: "Spinning Tops",
      icon: "Top",
      description: "A spinning top demonstrates precession beautifully. Gravity creates torque on the tilted axis, but instead of falling, it precesses.",
      details: "The faster the spin, the slower the precession. Nutation (wobbling) is superimposed when the top is released. Friction eventually slows the spin, increasing precession until the top falls.",
      keyPoint: "Torque changes direction of angular momentum, not magnitude"
    },
    {
      title: "Bike Steering",
      icon: "Bike",
      description: "Bicycle wheels act as gyroscopes. When you lean, the wheel's angular momentum creates a torque that turns the handlebars.",
      details: "This gyroscopic precession helps stabilize bikes at speed. The effect is why counter-steering works: push right handlebar to turn right at high speed. At low speeds, direct steering dominates.",
      keyPoint: "Gyroscopic effects increase with wheel speed"
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
                ? 'bg-indigo-600 text-white'
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
          <div className="w-12 h-12 bg-indigo-600/30 rounded-xl flex items-center justify-center">
            <span className="text-indigo-400 font-bold">{applications[activeAppTab].icon.charAt(0)}</span>
          </div>
          <h3 className="text-xl font-bold text-white">{applications[activeAppTab].title}</h3>
        </div>

        <p className="text-lg text-slate-300 mb-4">
          {applications[activeAppTab].description}
        </p>
        <p className="text-sm text-slate-400 mb-4">
          {applications[activeAppTab].details}
        </p>
        <div className="bg-indigo-900/30 rounded-lg p-3">
          <p className="text-indigo-400 font-medium text-sm">
            Key Point: {applications[activeAppTab].keyPoint}
          </p>
        </div>

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
          className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all duration-300"
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
            onClick={() => {
              const score = calculateScore();
              setTestScore(score);
              setShowTestResults(true);
              emit('test_completed', { score, total: 10 });
            }}
            style={{ zIndex: 10 }}
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
          <div className="text-6xl mb-4">{testScore >= 7 ? 'Excellent!' : 'Keep Learning'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Score: {testScore}/10
          </h3>
          <p className="text-slate-300 mb-6">
            {testScore >= 7
              ? 'Excellent! You\'ve mastered precession and nutation!'
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
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all duration-300"
            >
              Review & Try Again
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
      <div className="bg-gradient-to-br from-indigo-900/50 via-purple-900/50 to-pink-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">Mastery Achieved!</div>
        <h1 className="text-3xl font-bold text-white mb-4">Precession & Nutation Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          Congratulations! You've mastered the physics of precession and nutation!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">Precession</div>
            <p className="text-sm text-slate-300">Torque-driven axis rotation</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">Nutation</div>
            <p className="text-sm text-slate-300">Wobbling dynamics</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">Earth</div>
            <p className="text-sm text-slate-300">26,000-year cycle</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">Applications</div>
            <p className="text-sm text-slate-300">Gyroscopes, navigation, more</p>
          </div>
        </div>

        <div className="bg-emerald-900/30 rounded-xl p-4 mb-6">
          <p className="text-emerald-400 font-medium">
            You now understand how angular momentum and torque create the fascinating motions
            seen in spinning tops, gyroscopes, and even our planet Earth!
          </p>
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
            {phaseOrder.map((p, index) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-indigo-400 w-6 shadow-lg shadow-indigo-400/30'
                    : currentPhaseIndex > index
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
