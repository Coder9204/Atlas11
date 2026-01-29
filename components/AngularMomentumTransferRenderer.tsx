import React, { useState, useEffect, useCallback, useRef } from 'react';

// Phase is now numeric 0-9 for consistency with gold standard
// 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'simulation_stopped'
  | 'parameter_changed'
  | 'animation_started'
  | 'animation_completed'
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

const AngularMomentumTransferRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
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
  const [fallProgress, setFallProgress] = useState(0);
  const [catRotation, setCatRotation] = useState(180); // Starts upside down
  const [frontLegsExtended, setFrontLegsExtended] = useState(false);
  const [backLegsExtended, setBackLegsExtended] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPhaseLabelsState, setShowPhaseLabelsState] = useState(true);

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
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'complete' | 'transition' | 'meow') => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
        click: { freq: 600, duration: 0.1, type: 'sine' },
        success: { freq: 800, duration: 0.2, type: 'sine' },
        failure: { freq: 300, duration: 0.3, type: 'sawtooth' },
        complete: { freq: 1000, duration: 0.3, type: 'sine' },
        transition: { freq: 500, duration: 0.15, type: 'triangle' },
        meow: { freq: 700, duration: 0.2, type: 'sine' }
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

  // Cat righting animation
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setFallProgress(prev => {
        const newProgress = prev + 2;

        // Phase 1: 0-30% - Cat extends back legs, tucks front legs
        if (newProgress < 30) {
          setFrontLegsExtended(false);
          setBackLegsExtended(true);
          setCatRotation(180 - (newProgress / 30) * 90); // Rotate front half
        }
        // Phase 2: 30-60% - Swap: extend front, tuck back
        else if (newProgress < 60) {
          setFrontLegsExtended(true);
          setBackLegsExtended(false);
          setCatRotation(90 - ((newProgress - 30) / 30) * 90); // Rotate back half
        }
        // Phase 3: 60-100% - Prepare for landing
        else if (newProgress < 100) {
          setFrontLegsExtended(true);
          setBackLegsExtended(true);
          setCatRotation(Math.max(0, 0 - ((newProgress - 60) / 40) * 5)); // Fine tuning
        }
        // Reset
        else {
          setIsAnimating(false);
          return 0;
        }

        return newProgress;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating]);

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
    playSound(prediction === 'C' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
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
    setFallProgress(0);
    setCatRotation(180);
    setFrontLegsExtended(false);
    setBackLegsExtended(true);
    setIsAnimating(true);
  }, []);

  const testQuestions = [
    {
      question: "How can a cat rotate in mid-air without external torque?",
      options: [
        { text: "It pushes against the air", correct: false },
        { text: "It transfers angular momentum between body parts", correct: true },
        { text: "Gravity helps it rotate", correct: false },
        { text: "It can't - cats have magic", correct: false }
      ]
    },
    {
      question: "When a cat extends one set of legs while tucking the other:",
      options: [
        { text: "Both halves rotate the same amount", correct: false },
        { text: "The tucked half rotates more", correct: true },
        { text: "The extended half rotates more", correct: false },
        { text: "Neither half rotates", correct: false }
      ]
    },
    {
      question: "During the righting reflex, the total angular momentum of the cat is:",
      options: [
        { text: "Constantly increasing", correct: false },
        { text: "Constantly decreasing", correct: false },
        { text: "Zero (or constant)", correct: true },
        { text: "Negative", correct: false }
      ]
    },
    {
      question: "The 'moment of inertia' of extended legs compared to tucked legs is:",
      options: [
        { text: "Smaller", correct: false },
        { text: "Larger", correct: true },
        { text: "The same", correct: false },
        { text: "Undefined", correct: false }
      ]
    },
    {
      question: "If a body part has lower moment of inertia, it can rotate:",
      options: [
        { text: "Slower", correct: false },
        { text: "Faster for the same angular momentum", correct: true },
        { text: "Not at all", correct: false },
        { text: "Only backward", correct: false }
      ]
    },
    {
      question: "Astronauts can self-rotate in space using the same principle by:",
      options: [
        { text: "Swimming through air", correct: false },
        { text: "Extending and retracting their limbs asymmetrically", correct: true },
        { text: "Using jet packs", correct: false },
        { text: "Pushing off walls only", correct: false }
      ]
    },
    {
      question: "The minimum height for a cat to right itself is approximately:",
      options: [
        { text: "1 centimeter", correct: false },
        { text: "30 centimeters (about 1 foot)", correct: true },
        { text: "5 meters", correct: false },
        { text: "Any height works", correct: false }
      ]
    },
    {
      question: "If a falling object has zero initial angular momentum, its final angular momentum will be:",
      options: [
        { text: "Positive", correct: false },
        { text: "Negative", correct: false },
        { text: "Zero", correct: true },
        { text: "Depends on shape", correct: false }
      ]
    },
    {
      question: "The cat righting problem was famously studied using:",
      options: [
        { text: "Slow motion photography", correct: true },
        { text: "Computer simulations only", correct: false },
        { text: "Mathematical theory only", correct: false },
        { text: "It has never been studied", correct: false }
      ]
    },
    {
      question: "A diver performing twists uses the same principle by:",
      options: [
        { text: "Flapping their arms like wings", correct: false },
        { text: "Asymmetrically moving arms and legs", correct: true },
        { text: "Holding completely still", correct: false },
        { text: "Spinning before jumping", correct: false }
      ]
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  const renderCat = (rotation: number, frontExt: boolean, backExt: boolean, size: number = 200, showLabels: boolean = false) => {
    const centerX = size / 2;
    const centerY = size / 2;

    // Front and back body segments rotate somewhat independently
    const frontRotation = rotation;
    const backRotation = rotation; // In reality, slightly different, but simplified here

    return (
      <svg width={size} height={size} className="overflow-visible">
        {/* Background - sky or space */}
        <rect x="0" y="0" width={size} height={size} fill="url(#skyGrad)" rx="10" />

        {/* Cat body */}
        <g transform={`translate(${centerX}, ${centerY}) rotate(${rotation})`}>
          {/* Back body segment */}
          <g transform={`rotate(${backRotation - rotation})`}>
            <ellipse cx="20" cy="0" rx="30" ry="20" fill="#f97316" />
            {/* Back legs */}
            {backExt ? (
              <>
                <rect x="30" y="-25" width="8" height="30" rx="3" fill="#ea580c" transform="rotate(-30, 30, -10)" />
                <rect x="30" y="-5" width="8" height="30" rx="3" fill="#ea580c" transform="rotate(30, 30, 10)" />
              </>
            ) : (
              <>
                <rect x="35" y="-12" width="6" height="15" rx="3" fill="#ea580c" transform="rotate(-15, 35, -5)" />
                <rect x="35" y="-3" width="6" height="15" rx="3" fill="#ea580c" transform="rotate(15, 35, 5)" />
              </>
            )}
            {/* Tail */}
            <path d="M45,0 Q60,-10 70,5 Q80,20 70,25" fill="none" stroke="#ea580c" strokeWidth="6" strokeLinecap="round" />
            {showLabels && backExt && (
              <text x="50" y="45" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="bold">Extended (Large I)</text>
            )}
            {showLabels && !backExt && (
              <text x="50" y="35" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">Tucked (Small I)</text>
            )}
          </g>

          {/* Front body segment */}
          <g transform={`rotate(${frontRotation - rotation})`}>
            <ellipse cx="-20" cy="0" rx="25" ry="18" fill="#fb923c" />
            {/* Head */}
            <circle cx="-45" cy="0" r="18" fill="#f97316" />
            {/* Ears */}
            <polygon points="-55,-15 -58,-30 -48,-18" fill="#ea580c" />
            <polygon points="-35,-15 -32,-30 -42,-18" fill="#ea580c" />
            {/* Face */}
            <circle cx="-50" cy="-3" r="3" fill="#1e293b" />
            <circle cx="-40" cy="-3" r="3" fill="#1e293b" />
            <ellipse cx="-45" cy="5" rx="4" ry="2" fill="#fda4af" />
            {/* Front legs */}
            {frontExt ? (
              <>
                <rect x="-35" y="-25" width="8" height="30" rx="3" fill="#ea580c" transform="rotate(30, -35, -10)" />
                <rect x="-35" y="-5" width="8" height="30" rx="3" fill="#ea580c" transform="rotate(-30, -35, 10)" />
              </>
            ) : (
              <>
                <rect x="-30" y="-12" width="6" height="15" rx="3" fill="#ea580c" transform="rotate(15, -30, -5)" />
                <rect x="-30" y="-3" width="6" height="15" rx="3" fill="#ea580c" transform="rotate(-15, -30, 5)" />
              </>
            )}
            {showLabels && frontExt && (
              <text x="-45" y="45" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="bold">Extended (Large I)</text>
            )}
            {showLabels && !frontExt && (
              <text x="-45" y="35" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">Tucked (Small I)</text>
            )}
          </g>
        </g>

        {/* Ground indicator */}
        <rect x="0" y={size - 15} width={size} height="15" fill="#22c55e" />
        <rect x="0" y={size - 15} width={size} height="3" fill="#16a34a" />

        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-orange-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-amber-200 bg-clip-text text-transparent">
        The Cat Righting Reflex
      </h1>

      <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-8 leading-relaxed">
        How do cats always land on their feet with nothing to push against?
      </p>

      {/* Premium card with cat animation */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-8 max-w-2xl border border-slate-700/50 shadow-2xl shadow-orange-500/5 mb-8">
        <div className="flex justify-center mb-6">
          {renderCat(catRotation, frontLegsExtended, backLegsExtended, 220)}
        </div>

        <p className="text-xl text-slate-200 mb-4 leading-relaxed">
          Cats almost always land on their feet, even when dropped upside down from just a few feet up!
        </p>

        <p className="text-lg text-orange-400 font-medium mb-6">
          How do they rotate in mid-air with nothing to push against?
        </p>

        <button
          onMouseDown={(e) => { e.preventDefault(); startAnimation(); }}
          className="px-6 py-3 bg-slate-700/80 hover:bg-slate-600/80 text-white font-medium rounded-xl transition-all duration-300 border border-slate-600/50 hover:border-orange-500/30"
        >
          Watch Cat Fall
        </button>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="group relative px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-2">
          Discover the Secret
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Subtle hint text */}
      <p className="mt-6 text-sm text-slate-500">
        Explore the physics of angular momentum transfer
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A cat is dropped upside down in free fall. How does it manage to rotate and land on its feet?
        </p>
        {renderCat(180, false, true, 180)}
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'It pushes against the air like swimming' },
          { id: 'B', text: 'Gravity pulls one side down first' },
          { id: 'C', text: 'It extends/retracts different body parts to redistribute angular momentum' },
          { id: 'D', text: 'Cats have a special "anti-gravity" organ' }
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
            ✓ Correct! Cats use <span className="text-cyan-400">angular momentum transfer</span> between body parts!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300"
          >
            Explore the Physics →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Cat Righting Lab</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderCat(catRotation, frontLegsExtended, backLegsExtended, 250, showPhaseLabels)}
        <div className="mt-4 flex justify-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{Math.round(180 - catRotation)}°</div>
            <div className="text-sm text-slate-400">Rotation Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">{Math.round(fallProgress)}%</div>
            <div className="text-sm text-slate-400">Fall Progress</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
        <button
          onMouseDown={(e) => { e.preventDefault(); startAnimation(); }}
          className="p-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold transition-colors"
        >
          🐱 Start Cat Drop
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowPhaseLabels(!showPhaseLabels); }}
          className={`p-4 rounded-xl transition-colors ${
            showPhaseLabels ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-slate-600 hover:bg-slate-500'
          } text-white font-semibold`}
        >
          {showPhaseLabels ? '🏷️ Labels: ON' : '🏷️ Labels: OFF'}
        </button>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">The Two-Phase Righting Reflex:</h3>
        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <div className="bg-orange-600 text-white px-2 py-1 rounded text-xs font-bold">Phase 1</div>
            <p>Front legs tuck (small I, fast rotation), back legs extend (large I, slow counter-rotation). Net result: front half rotates more!</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-amber-600 text-white px-2 py-1 rounded text-xs font-bold">Phase 2</div>
            <p>Swap! Front legs extend, back legs tuck. Now back half "catches up" with more rotation. Cat is now upright!</p>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300"
      >
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Angular Momentum Transfer</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-orange-900/50 to-amber-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-orange-400 mb-3">🔄 The Core Principle</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Total angular momentum (L) must stay constant (zero in this case)</li>
            <li>• L = I × ω (moment of inertia × angular velocity)</li>
            <li>• If one part has small I, it rotates fast</li>
            <li>• If another part has large I, it rotates slow</li>
            <li>• By alternating which part is compact, net rotation accumulates!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">🐱 Cat's Flexible Spine</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Cats have an extremely flexible spine</li>
            <li>• They can rotate front and back halves almost independently</li>
            <li>• 30+ vertebrae give remarkable twist ability</li>
            <li>• No collarbone allows front legs to move freely</li>
            <li>• Reflexes complete in under 0.3 seconds!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">🧮 The Math</h3>
          <div className="text-slate-300 text-sm space-y-2">
            <p><strong>Conservation:</strong> L_front + L_back = 0 (always)</p>
            <p><strong>When front is tucked:</strong> I_front is small, so ω_front can be large while I_back × ω_back balances it</p>
            <p><strong>Net effect:</strong> Front rotates 90° while back only counter-rotates 30°</p>
            <p className="text-cyan-400 mt-3">
              Then swap configurations—back catches up while front barely moves. Total: 180° rotation with zero angular momentum!
            </p>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Discover a Surprising Twist →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">🌟 The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Imagine an astronaut floating in the middle of a space station, not touching anything. They're facing the wrong direction for their task.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          Can they rotate to face a different direction without grabbing anything?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'No - without something to push against, rotation is impossible' },
          { id: 'B', text: 'Yes - they can use the same technique as cats' },
          { id: 'C', text: 'Only if they throw something' },
          { id: 'D', text: 'Only with special astronaut equipment' }
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
            ✓ Yes! Astronauts can self-rotate using the exact same physics!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            It's slower and less elegant than a cat, but the principle is identical. Astronauts are trained in these maneuvers!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            See How →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">Astronaut Self-Rotation</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-3xl">
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2 text-center">Cat Method</h3>
          <svg width="180" height="120" className="mx-auto">
            {/* Cat silhouette */}
            <ellipse cx="60" cy="60" rx="25" ry="15" fill="#f97316" />
            <ellipse cx="100" cy="60" rx="25" ry="15" fill="#fb923c" />
            <circle cx="130" cy="60" r="12" fill="#f97316" />
            {/* Rotation arrows */}
            <path d="M60,35 A25,25 0 0 1 60,85" fill="none" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowGreen)" />
            <path d="M100,85 A25,25 0 0 1 100,35" fill="none" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowRed)" />
            <text x="90" y="110" textAnchor="middle" fill="#94a3b8" fontSize="10">Flexible spine rotation</text>
          </svg>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-purple-400 mb-2 text-center">Astronaut Method</h3>
          <svg width="180" height="120" className="mx-auto">
            {/* Astronaut */}
            <circle cx="90" cy="40" r="15" fill="#f8fafc" stroke="#64748b" strokeWidth="2" />
            <rect x="75" y="55" width="30" height="35" rx="5" fill="#f8fafc" stroke="#64748b" strokeWidth="2" />
            {/* Arms in motion */}
            <line x1="75" y1="65" x2="45" y2="45" stroke="#f8fafc" strokeWidth="6" strokeLinecap="round" />
            <line x1="105" y1="65" x2="135" y2="85" stroke="#f8fafc" strokeWidth="6" strokeLinecap="round" />
            {/* Rotation arrow */}
            <path d="M70,95 A40,40 0 0 0 110,95" fill="none" stroke="#a855f7" strokeWidth="2" markerEnd="url(#arrowPurple)" />
            <text x="90" y="110" textAnchor="middle" fill="#94a3b8" fontSize="10">Asymmetric arm circles</text>
          </svg>
        </div>
        <defs>
          <marker id="arrowGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#22c55e" />
          </marker>
          <marker id="arrowRed" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
          </marker>
          <marker id="arrowPurple" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#a855f7" />
          </marker>
        </defs>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-purple-400 mb-3">Astronaut Techniques:</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• <strong>Arm circles:</strong> Extend one arm, circle it while keeping the other tucked</li>
          <li>• <strong>Bicycle legs:</strong> "Pedal" legs in asymmetric patterns</li>
          <li>• <strong>Hula motion:</strong> Rotate hips while keeping shoulders fixed</li>
          <li>• <strong>Combination:</strong> Use all limbs in coordinated asymmetric patterns</li>
        </ul>
        <p className="text-cyan-400 mt-4 text-sm">
          It's slower than a cat (humans are less flexible), but the physics is identical!
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Review the Discovery →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">🌟 Key Discovery</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Angular Momentum Transfer Is Universal!</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            Any object with movable parts can change its orientation without external forces by:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Moving parts to change moment of inertia distribution</li>
            <li>Rotating different sections at different rates</li>
            <li>Repeating with reversed configuration</li>
            <li>Accumulating net rotation over multiple cycles</li>
          </ol>
          <p className="text-emerald-400 font-medium mt-4">
            This works in space, underwater, in mid-air—anywhere! No magic required, just physics!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300"
      >
        Explore Real-World Applications →
      </button>
    </div>
  );

  const applications = [
    {
      title: "Diving & Gymnastics",
      icon: "🏊",
      description: "Divers and gymnasts use asymmetric arm and leg movements to control twists in mid-air.",
      details: "A diver can initiate a twist after leaving the board by dropping one shoulder and asymmetrically moving their arms. The same physics that rights a cat allows them to add rotations!",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          {/* Water */}
          <rect x="0" y="120" width="200" height="30" fill="#3b82f6" opacity="0.5" />
          {/* Platform */}
          <rect x="10" y="20" width="40" height="8" fill="#64748b" />
          {/* Diver stages */}
          <g transform="translate(35, 45)">
            <ellipse cx="0" cy="0" rx="5" ry="12" fill="#fcd9b6" />
            <line x1="-8" y1="-5" x2="-18" y2="-15" stroke="#fcd9b6" strokeWidth="3" />
            <line x1="8" y1="-5" x2="18" y2="5" stroke="#fcd9b6" strokeWidth="3" />
          </g>
          <g transform="translate(90, 70) rotate(90)">
            <circle cx="0" cy="0" r="10" fill="#fcd9b6" />
          </g>
          <g transform="translate(145, 95) rotate(180)">
            <ellipse cx="0" cy="0" rx="5" ry="12" fill="#fcd9b6" />
          </g>
          {/* Twist arrows */}
          <path d="M70,60 Q80,50 90,60" fill="none" stroke="#a855f7" strokeWidth="2" />
          <text x="100" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">Asymmetric arms add twist</text>
        </svg>
      )
    },
    {
      title: "Space Operations",
      icon: "🚀",
      description: "Astronauts use self-rotation techniques during spacewalks and inside spacecraft.",
      details: "NASA trains astronauts in these maneuvers in underwater neutral buoyancy facilities. During EVAs, being able to reorient without grabbing anything can be crucial for safety.",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          {/* Stars */}
          {[1,2,3,4,5,6,7,8,9,10].map(i => (
            <circle key={i} cx={(i * 19) % 190 + 5} cy={(i * 13) % 130 + 10} r="1" fill="white" opacity="0.6" />
          ))}
          {/* Space station segment */}
          <rect x="0" y="50" width="60" height="50" fill="#64748b" />
          <rect x="60" y="40" width="80" height="70" fill="#94a3b8" />
          {/* Astronaut floating */}
          <g transform="translate(120, 75)">
            <circle cx="0" cy="-15" r="12" fill="white" stroke="#64748b" strokeWidth="2" />
            <rect x="-10" y="-3" width="20" height="30" rx="3" fill="white" stroke="#64748b" strokeWidth="2" />
            {/* Rotating arms */}
            <line x1="-10" y1="5" x2="-25" y2="-5" stroke="white" strokeWidth="4" />
            <line x1="10" y1="5" x2="25" y2="15" stroke="white" strokeWidth="4" />
          </g>
          {/* Rotation arrow */}
          <path d="M100,90 A30,30 0 0 1 140,90" fill="none" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowGreen)" />
          <text x="100" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">Self-rotation in microgravity</text>
        </svg>
      )
    },
    {
      title: "Falling Robots",
      icon: "🤖",
      description: "Aerial drones and falling robots use reaction wheels and limb movements to self-right.",
      details: "Boston Dynamics' robots use rapid limb movements to reorient during falls. Some drones have internal reaction wheels that spin up to control orientation without aerodynamic surfaces.",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          {/* Robot body */}
          <rect x="70" y="40" width="60" height="50" rx="5" fill="#64748b" />
          {/* Screen face */}
          <rect x="80" y="50" width="40" height="25" rx="2" fill="#1e293b" />
          <circle cx="90" cy="60" r="3" fill="#22c55e" />
          <circle cx="110" cy="60" r="3" fill="#22c55e" />
          {/* Limbs in motion */}
          <line x1="70" y1="60" x2="40" y2="30" stroke="#94a3b8" strokeWidth="6" />
          <line x1="130" y1="60" x2="160" y2="90" stroke="#94a3b8" strokeWidth="6" />
          <line x1="85" y1="90" x2="75" y2="120" stroke="#94a3b8" strokeWidth="6" />
          <line x1="115" y1="90" x2="125" y2="120" stroke="#94a3b8" strokeWidth="6" />
          {/* Rotation indicator */}
          <path d="M40,75 Q50,95 70,85" fill="none" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrowOrange)" />
          <defs>
            <marker id="arrowOrange" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#f59e0b" />
            </marker>
          </defs>
          <text x="100" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">Rapid limb adjustment</text>
        </svg>
      )
    },
    {
      title: "Ice Skating Spins",
      icon: "⛸️",
      description: "Skaters use arm and leg positions not just for speed, but also to initiate and control twist direction.",
      details: "A skater can start a spin in one direction, then use asymmetric arm movements to reverse it or add twisting rotations—all through angular momentum transfer between body parts.",
      animation: (
        <svg width="200" height="150" className="mx-auto">
          {/* Ice */}
          <ellipse cx="100" cy="130" rx="80" ry="15" fill="#a5f3fc" opacity="0.4" />
          {/* Skater */}
          <circle cx="100" cy="45" r="12" fill="#fcd9b6" />
          <ellipse cx="100" cy="75" rx="15" ry="25" fill="#ec4899" />
          {/* Arms asymmetric */}
          <line x1="85" y1="60" x2="55" y2="40" stroke="#fcd9b6" strokeWidth="4" />
          <line x1="115" y1="60" x2="130" y2="80" stroke="#fcd9b6" strokeWidth="4" />
          {/* Leg */}
          <line x1="100" y1="100" x2="100" y2="125" stroke="#fcd9b6" strokeWidth="4" />
          {/* Rotation arrows */}
          <path d="M65,75 A40,40 0 0 0 135,75" fill="none" stroke="#a855f7" strokeWidth="2" strokeDasharray="4 2" />
          <text x="100" y="145" textAnchor="middle" fill="#94a3b8" fontSize="10">Asymmetric arms control twist</text>
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
                ? 'bg-orange-600 text-white'
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
          className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300"
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
                        ? 'bg-orange-600 text-white'
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
                : 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-500 hover:to-amber-500'
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
              ? 'Excellent! You\'ve mastered angular momentum transfer!'
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
              className="px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300"
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
      <div className="bg-gradient-to-br from-orange-900/50 via-amber-900/50 to-yellow-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🐱</div>
        <h1 className="text-3xl font-bold text-white mb-4">Angular Momentum Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the physics of angular momentum transfer and the cat righting reflex!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔄</div>
            <p className="text-sm text-slate-300">Momentum Transfer</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🐱</div>
            <p className="text-sm text-slate-300">Righting Reflex</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🚀</div>
            <p className="text-sm text-slate-300">Space Maneuvers</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⚖️</div>
            <p className="text-sm text-slate-300">Moment of Inertia</p>
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-600/3 rounded-full blur-3xl" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-orange-400">Angular Momentum</span>
          <div className="flex gap-1.5">
            {PHASES.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p ? 'bg-orange-500 w-6' : phase > i ? 'bg-emerald-500 w-2' : 'bg-slate-600 w-2'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm text-slate-400 font-medium">{phaseLabels[phase]}</span>
        </div>
      </div>

      <div className="relative z-10 pt-16 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default AngularMomentumTransferRenderer;
