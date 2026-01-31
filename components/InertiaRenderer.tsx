'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// INERTIA RENDERER - Premium 10-Phase Learning Experience
// ============================================================================
// Teaches Newton's First Law: Objects at rest stay at rest, objects in motion
// stay in motion, unless acted upon by an external force.
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

interface InertiaRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

export default function InertiaRenderer({ onGameEvent, gamePhase }: InertiaRendererProps) {
  // Core State
  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);

  // Hook phase
  const [hookStep, setHookStep] = useState(0);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);

  // Play phase - Objects with different masses
  const [selectedMass, setSelectedMass] = useState<'light' | 'heavy'>('light');
  const [hasAppliedForce, setHasAppliedForce] = useState(false);
  const [objectPosition, setObjectPosition] = useState(50);
  const [isMoving, setIsMoving] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict - Seatbelts scenario
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - Car/passenger simulation
  const [carSpeed, setCarSpeed] = useState(0);
  const [carPosition, setCarPosition] = useState(50);
  const [passengerPosition, setPassengerPosition] = useState(0);
  const [hasCrashed, setHasCrashed] = useState(false);
  const [seatbeltOn, setSeatbeltOn] = useState(false);
  const [showCrashResult, setShowCrashResult] = useState(false);
  const carAnimationRef = useRef<number | null>(null);

  // Twist review
  const [twistReviewStep, setTwistReviewStep] = useState(0);

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test phase
  const [testQuestions] = useState([
    {
      question: "According to Newton's First Law, what happens to an object at rest with no forces acting on it?",
      options: [
        { text: "It starts moving slowly", correct: false },
        { text: "It stays at rest", correct: true },
        { text: "It floats upward", correct: false },
        { text: "It shrinks", correct: false }
      ],
      explanation: "Newton's First Law (Law of Inertia) states that an object at rest stays at rest unless acted upon by an external force."
    },
    {
      question: "What is inertia?",
      options: [
        { text: "A type of energy", correct: false },
        { text: "Resistance to change in motion", correct: true },
        { text: "A force that pushes objects", correct: false },
        { text: "The speed of an object", correct: false }
      ],
      explanation: "Inertia is the tendency of an object to resist changes in its state of motion. More mass = more inertia."
    },
    {
      question: "A heavy object has more inertia than a light object. This means:",
      options: [
        { text: "It's harder to start or stop the heavy object", correct: true },
        { text: "The heavy object moves faster", correct: false },
        { text: "The heavy object floats better", correct: false },
        { text: "The light object is stronger", correct: false }
      ],
      explanation: "More mass means more inertia, which means more resistance to changes in motion - harder to speed up, slow down, or change direction."
    },
    {
      question: "When a bus suddenly stops, passengers lurch forward because:",
      options: [
        { text: "The bus pushes them forward", correct: false },
        { text: "Their bodies continue moving due to inertia", correct: true },
        { text: "Gravity changes direction", correct: false },
        { text: "The air pushes them", correct: false }
      ],
      explanation: "The passengers' bodies were moving with the bus. When the bus stops, their bodies continue moving forward due to inertia."
    },
    {
      question: "Why do seatbelts save lives in car crashes?",
      options: [
        { text: "They make the car stronger", correct: false },
        { text: "They provide the force to stop your body's inertia", correct: true },
        { text: "They slow down the crash", correct: false },
        { text: "They make you lighter", correct: false }
      ],
      explanation: "In a crash, the car stops but your body keeps moving due to inertia. Seatbelts provide the external force to safely stop your body."
    },
    {
      question: "An object in motion will stay in motion unless:",
      options: [
        { text: "It gets tired", correct: false },
        { text: "An external force acts on it", correct: true },
        { text: "It runs out of energy", correct: false },
        { text: "Gravity pulls it down", correct: false }
      ],
      explanation: "Newton's First Law states that objects in motion stay in motion in a straight line unless acted upon by an external force."
    },
    {
      question: "In space (no friction or air resistance), a thrown ball will:",
      options: [
        { text: "Stop after a few seconds", correct: false },
        { text: "Keep moving forever at constant speed", correct: true },
        { text: "Speed up over time", correct: false },
        { text: "Fall to the ground", correct: false }
      ],
      explanation: "With no external forces (no friction, no air resistance), the ball's inertia keeps it moving forever at constant velocity."
    },
    {
      question: "The tablecloth trick works because:",
      options: [
        { text: "The dishes are glued down", correct: false },
        { text: "The dishes' inertia keeps them in place during the quick pull", correct: true },
        { text: "Magic holds the dishes", correct: false },
        { text: "The tablecloth is slippery", correct: false }
      ],
      explanation: "When pulled quickly, friction doesn't have time to transfer motion to the dishes. Their inertia keeps them nearly stationary."
    },
    {
      question: "If you're in a car making a sharp right turn, you feel pushed to the left. This is because:",
      options: [
        { text: "The door pushes you", correct: false },
        { text: "Your body's inertia resists the change in direction", correct: true },
        { text: "Gravity shifts", correct: false },
        { text: "The air moves you", correct: false }
      ],
      explanation: "Your body 'wants' to continue in a straight line (inertia). The car turns right, but your body initially continues straight."
    },
    {
      question: "Newton's First Law is also called the Law of:",
      options: [
        { text: "Gravity", correct: false },
        { text: "Motion", correct: false },
        { text: "Inertia", correct: true },
        { text: "Energy", correct: false }
      ],
      explanation: "Newton's First Law is called the Law of Inertia because it describes how objects resist changes to their state of motion."
    }
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [testComplete, setTestComplete] = useState(false);

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

  // Sync with external phase
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Sound effect
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

  // Event emitter
  const emitEvent = useCallback((type: string, details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      type,
      gameType: 'inertia',
      gameTitle: 'Inertia',
      details: { phase, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase]);

  // Navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    setPhase(newPhase);
    playSound('transition');
    emitEvent('phase_change', { from: phase, to: newPhase });

    // Reset state for play phases
    if (newPhase === 'play') {
      setObjectPosition(50);
      setHasAppliedForce(false);
      setIsMoving(false);
    }
    if (newPhase === 'twist_play') {
      setCarSpeed(0);
      setCarPosition(50);
      setPassengerPosition(0);
      setHasCrashed(false);
      setShowCrashResult(false);
    }
  }, [phase, playSound, emitEvent]);

  // Apply force animation for play phase
  const applyForce = useCallback(() => {
    if (hasAppliedForce) return;
    setHasAppliedForce(true);
    setIsMoving(true);
    playSound('click');

    const acceleration = selectedMass === 'light' ? 2 : 0.5;
    let position = 50;
    let velocity = 0;

    const animate = () => {
      velocity += acceleration;
      position += velocity;
      setObjectPosition(position);

      if (position < 350) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsMoving(false);
        playSound('success');
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [hasAppliedForce, selectedMass, playSound]);

  // Car crash simulation
  const startDriving = useCallback(() => {
    if (carSpeed > 0) return;
    setCarSpeed(60);
    playSound('click');

    let pos = 50;
    const animate = () => {
      pos += 3;
      setCarPosition(pos);

      if (pos >= 250) {
        // Crash!
        setHasCrashed(true);
        setCarSpeed(0);

        if (!seatbeltOn) {
          // Passenger continues moving due to inertia
          let passengerPos = 0;
          const passengerAnimate = () => {
            passengerPos += 8;
            setPassengerPosition(passengerPos);
            if (passengerPos < 60) {
              requestAnimationFrame(passengerAnimate);
            } else {
              playSound('failure');
              setShowCrashResult(true);
            }
          };
          requestAnimationFrame(passengerAnimate);
        } else {
          playSound('success');
          setShowCrashResult(true);
        }
        return;
      }

      carAnimationRef.current = requestAnimationFrame(animate);
    };

    carAnimationRef.current = requestAnimationFrame(animate);
  }, [carSpeed, seatbeltOn, playSound]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (carAnimationRef.current) cancelAnimationFrame(carAnimationRef.current);
    };
  }, []);

  // Handle test answer
  const handleTestAnswer = useCallback((answerIndex: number) => {
    if (showExplanation) return;

    setSelectedAnswer(answerIndex);
    setShowExplanation(true);

    if (testQuestions[currentQuestion].options[answerIndex]?.correct) {
      setTestScore(s => s + 1);
      playSound('success');
    } else {
      playSound('failure');
    }
  }, [currentQuestion, showExplanation, testQuestions, playSound]);

  // Applications for transfer phase
  const applications = [
    {
      title: "Seatbelts",
      icon: "\uD83D\uDE97",
      description: "Seatbelts are designed to counteract inertia. In a crash, your body continues moving forward while the car stops. The seatbelt provides the external force needed to slow you down safely, preventing you from hitting the dashboard or windshield.",
      fact: "Wearing a seatbelt reduces the risk of fatal injury by 45% for front-seat passengers!",
    },
    {
      title: "Tablecloth Trick",
      icon: "\uD83C\uDFA9",
      description: "Magicians pull tablecloths from under dishes using inertia! When pulled quickly, friction doesn't have enough time to transfer motion to the dishes. The dishes' inertia keeps them in place while the cloth slides away.",
      fact: "The key is speed - professional magicians can remove a tablecloth in under 0.1 seconds!",
    },
    {
      title: "Space Travel",
      icon: "\uD83D\uDE80",
      description: "In the vacuum of space, there's no air resistance or friction. Once a spacecraft reaches its velocity, it continues moving without using fuel - pure inertia! This is how we send probes to distant planets efficiently.",
      fact: "Voyager 1, launched in 1977, is still traveling at 38,000 mph due to inertia - no engines needed!",
    },
    {
      title: "Sports",
      icon: "\u26BD",
      description: "Athletes use inertia constantly! A bowling ball's mass gives it more inertia, making it harder to stop. Sprinters need more force to start moving than to maintain speed. Hockey pucks glide on low-friction ice due to inertia.",
      fact: "A professional baseball thrown at 100 mph has enough inertia to travel 400+ feet if hit correctly!",
    },
  ];

  // ==================== PHASE RENDERERS ====================

  const renderHook = () => {
    const hookContent = [
      {
        title: "Newton's First Law of Motion",
        content: "Have you ever wondered why you lurch forward when a car suddenly stops? Or why it's harder to push a heavy shopping cart than an empty one?",
        visual: "\u2696\uFE0F",
      },
      {
        title: "Objects Resist Change",
        content: "Isaac Newton discovered something amazing: Objects 'want' to keep doing what they're doing. If they're still, they want to stay still. If they're moving, they want to keep moving!",
        visual: "\uD83D\uDCA1",
      },
      {
        title: "This is Called INERTIA",
        content: "Inertia is the resistance of any object to any change in its motion. The more mass an object has, the more inertia it has - and the harder it is to change its motion.",
        visual: "\uD83C\uDFCB\uFE0F",
      },
    ];

    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
        {/* Premium badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-8">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-amber-400 tracking-wide">PHYSICS EXPLORATION</span>
        </div>

        {/* Main visual */}
        <div className="text-7xl mb-6" style={{ filter: 'drop-shadow(0 8px 24px rgba(245, 158, 11, 0.4))' }}>
          {hookContent[hookStep].visual}
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {hookContent[hookStep].title}
        </h1>

        {/* Content */}
        <p className="text-lg text-slate-400 max-w-md mb-8 leading-relaxed">
          {hookContent[hookStep].content}
        </p>

        {/* Step indicators */}
        <div className="flex gap-2 mb-8">
          {hookContent.map((_, i) => (
            <button
              key={i}
              onClick={() => setHookStep(i)}
              style={{ zIndex: 10 }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === hookStep ? 'w-8 bg-amber-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={() => {
            if (hookStep < hookContent.length - 1) {
              setHookStep(h => h + 1);
            } else {
              goToPhase('predict');
            }
          }}
          style={{ zIndex: 10 }}
          className="group relative px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="relative z-10 flex items-center gap-3">
            {hookStep < hookContent.length - 1 ? 'Continue' : 'Make a Prediction'}
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>

        {/* Feature hints */}
        <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">{'\u2726'}</span>
            Interactive Lab
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">{'\u2726'}</span>
            Real-World Examples
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">{'\u2726'}</span>
            Knowledge Test
          </div>
        </div>
      </div>
    );
  };

  const renderPredict = () => {
    const predictions = [
      { id: 'heavy_harder', label: 'The heavy object will be harder to move', icon: '\uD83C\uDFCB\uFE0F' },
      { id: 'same_speed', label: 'Both objects will move at the same speed', icon: '\u2194\uFE0F' },
      { id: 'light_slower', label: 'The light object will be slower', icon: '\uD83E\uDEB6' },
      { id: 'no_difference', label: 'There will be no difference', icon: '\u2753' },
    ];

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Make Your Prediction</h2>
        <p className="text-slate-400 mb-8">If you push a light object and a heavy object with the same force, what happens?</p>

        <div className="flex flex-col gap-3 w-full max-w-md mb-8">
          {predictions.map((pred) => (
            <button
              key={pred.id}
              onClick={() => {
                setPrediction(pred.id);
                playSound(pred.id === 'heavy_harder' ? 'success' : 'click');
                emitEvent('prediction_made', { prediction: pred.id });
              }}
              style={{ zIndex: 10 }}
              className={`p-4 rounded-xl border-2 transition-all duration-300 flex items-center gap-4 ${
                prediction === pred.id
                  ? 'border-amber-500 bg-amber-500/20'
                  : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50'
              }`}
            >
              <span className="text-2xl">{pred.icon}</span>
              <span className="text-white font-medium text-left">{pred.label}</span>
            </button>
          ))}
        </div>

        {prediction && (
          <button
            onClick={() => goToPhase('play')}
            style={{ zIndex: 10 }}
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all"
          >
            Test My Prediction {'\u2192'}
          </button>
        )}
      </div>
    );
  };

  const renderPlay = () => (
    <div className="flex flex-col items-center px-6 py-8">
      <h2 className="text-2xl font-bold text-white mb-2">Inertia Experiment</h2>
      <p className="text-slate-400 mb-6">Apply the same force to objects with different masses and observe!</p>

      {/* Simulation */}
      <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-700/50">
        <svg width="400" height="200" className="mx-auto">
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="inerBgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Ground gradient */}
            <linearGradient id="inerGroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="25%" stopColor="#374151" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="75%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Light object gradient (blue sphere) */}
            <radialGradient id="inerLightObjGradient" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="25%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="75%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </radialGradient>

            {/* Heavy object gradient (orange block) */}
            <linearGradient id="inerHeavyObjGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fdba74" />
              <stop offset="25%" stopColor="#fb923c" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="75%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>

            {/* Force arrow gradient */}
            <linearGradient id="inerForceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="40%" stopColor="#4ade80" />
              <stop offset="70%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>

            {/* Motion trail gradient */}
            <linearGradient id="inerTrailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={selectedMass === 'light' ? '#3b82f6' : '#f97316'} stopOpacity="0" />
              <stop offset="50%" stopColor={selectedMass === 'light' ? '#3b82f6' : '#f97316'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={selectedMass === 'light' ? '#3b82f6' : '#f97316'} stopOpacity="0.6" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="inerObjectGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="inerForceGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="inerShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
            </filter>

            {/* Arrow marker */}
            <marker id="inerArrowForce" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">
              <path d="M0,0 L0,8 L12,4 z" fill="url(#inerForceGradient)" />
            </marker>
          </defs>

          {/* Background */}
          <rect width="400" height="200" fill="url(#inerBgGradient)" rx="12" />

          {/* Ground with grid pattern */}
          <rect x="0" y="160" width="400" height="40" fill="url(#inerGroundGradient)" />
          <line x1="0" y1="160" x2="400" y2="160" stroke="#64748b" strokeWidth="2" />
          {/* Grid lines on ground */}
          {[50, 100, 150, 200, 250, 300, 350].map(x => (
            <line key={x} x1={x} y1="162" x2={x} y2="200" stroke="#4b5563" strokeWidth="1" strokeOpacity="0.5" />
          ))}

          {/* Motion trail when moving */}
          {isMoving && (
            <rect
              x={50}
              y={selectedMass === 'light' ? 120 : 110}
              width={objectPosition - 50}
              height={selectedMass === 'light' ? 40 : 50}
              fill="url(#inerTrailGradient)"
              rx="4"
            />
          )}

          {/* Object */}
          <g transform={`translate(${objectPosition}, 100)`} filter="url(#inerShadow)">
            {selectedMass === 'light' ? (
              // Light object - 3D sphere with highlight
              <>
                <ellipse cx="20" cy="58" rx="18" ry="4" fill="rgba(0,0,0,0.3)" />
                <circle cx="20" cy="40" r="20" fill="url(#inerLightObjGradient)" filter="url(#inerObjectGlow)" />
                <ellipse cx="14" cy="34" rx="6" ry="4" fill="rgba(255,255,255,0.3)" />
              </>
            ) : (
              // Heavy object - 3D block with shading
              <>
                <ellipse cx="30" cy="62" rx="28" ry="5" fill="rgba(0,0,0,0.3)" />
                <rect x="0" y="10" width="60" height="50" fill="url(#inerHeavyObjGradient)" rx="4" filter="url(#inerObjectGlow)" />
                {/* Top highlight */}
                <rect x="4" y="14" width="52" height="8" fill="rgba(255,255,255,0.15)" rx="2" />
                {/* Side shadow */}
                <rect x="52" y="14" width="6" height="42" fill="rgba(0,0,0,0.2)" rx="2" />
              </>
            )}
          </g>

          {/* Force arrow with glow */}
          {!hasAppliedForce && (
            <g transform="translate(20, 120)" filter="url(#inerForceGlow)">
              <line x1="0" y1="0" x2="30" y2="0" stroke="url(#inerForceGradient)" strokeWidth="4" markerEnd="url(#inerArrowForce)" />
              {/* Pulsing force indicator */}
              <circle cx="0" cy="0" r="5" fill="#22c55e" opacity="0.6">
                <animate attributeName="r" values="5;8;5" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0.3;0.6" dur="1s" repeatCount="indefinite" />
              </circle>
            </g>
          )}

          {/* Velocity indicator when moving */}
          {isMoving && (
            <g transform={`translate(${objectPosition + (selectedMass === 'light' ? 45 : 65)}, 120)`}>
              <line x1="0" y1="0" x2="20" y2="0" stroke="#fbbf24" strokeWidth="3" strokeDasharray="4 2">
                <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="0.3s" repeatCount="indefinite" />
              </line>
            </g>
          )}
        </svg>
      </div>

      {/* Labels outside SVG using typo system */}
      <div className="text-center mb-4">
        <p style={{ fontSize: typo.body }} className="text-slate-400">
          {isMoving ? 'Accelerating...' : hasAppliedForce ? 'Stopped!' : 'Ready to push'}
        </p>
        {hasAppliedForce && !isMoving && (
          <p style={{ fontSize: typo.small }} className="text-amber-400 mt-1">
            {selectedMass === 'light' ? 'Light object: Fast acceleration!' : 'Heavy object: Slow acceleration (more inertia)!'}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="w-full max-w-sm">
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/50">
          <h4 className="text-white font-medium mb-3">Select Object Mass</h4>
          <div className="flex gap-2">
            {(['light', 'heavy'] as const).map(mass => (
              <button
                key={mass}
                onClick={() => {
                  if (!hasAppliedForce) setSelectedMass(mass);
                }}
                style={{ zIndex: 10 }}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                  selectedMass === mass
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {mass === 'light' ? '\uD83D\uDFE6 Light (1kg)' : '\uD83D\uDFE7 Heavy (10kg)'}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => { if (!hasAppliedForce) applyForce(); }}
          disabled={hasAppliedForce && isMoving}
          style={{ zIndex: 10 }}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
            hasAppliedForce
              ? 'bg-slate-700 text-slate-400'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/25'
          }`}
        >
          {hasAppliedForce ? '\u2713 Force Applied!' : '\uD83D\uDC49 Apply Force!'}
        </button>

        {hasAppliedForce && !isMoving && (
          <button
            onClick={() => {
              setObjectPosition(50);
              setHasAppliedForce(false);
              setIsMoving(false);
            }}
            style={{ zIndex: 10 }}
            className="w-full mt-3 py-3 bg-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-600"
          >
            {'\uD83D\uDD04'} Try Again
          </button>
        )}

        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <p className="text-amber-400 text-sm">{'\uD83D\uDCA1'} Try both masses to see how inertia affects acceleration!</p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('review')}
        style={{ zIndex: 10 }}
        className="mt-6 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl"
      >
        Understand Results {'\u2192'}
      </button>
    </div>
  );

  const renderReview = () => {
    const wasCorrect = prediction === 'heavy_harder';
    const reviewContent = [
      {
        title: "What is Inertia?",
        content: `${wasCorrect ? "You predicted correctly! " : ""}Inertia is the resistance of any object to a change in its state of motion.\n\nThis includes:\n- Objects at rest resisting being moved\n- Objects in motion resisting being stopped\n- Objects resisting changes in direction`,
        highlight: wasCorrect,
      },
      {
        title: "Mass and Inertia",
        content: "The more mass an object has, the more inertia it has.\n\n- Heavy objects are harder to start moving\n- Heavy objects are harder to stop\n- Heavy objects are harder to change direction\n\nThis is why pushing a car is harder than pushing a bicycle!",
      },
      {
        title: "F = ma Explains It",
        content: "Newton's Second Law (F = ma) shows us why:\n\nFor the same Force:\n- Light object (small m) = Large acceleration\n- Heavy object (large m) = Small acceleration\n\nMore inertia means less response to the same force!",
      },
    ];

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Understanding Inertia</h2>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-lg w-full border border-slate-700/50 mb-6">
          <h3 className="text-xl font-bold text-amber-400 mb-4">{reviewContent[reviewStep].title}</h3>
          <p className="text-slate-300 whitespace-pre-line leading-relaxed">{reviewContent[reviewStep].content}</p>

          {reviewContent[reviewStep].highlight && (
            <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
              <p className="text-emerald-400">{'\u2713'} Great prediction! You correctly understood that heavier objects are harder to move.</p>
            </div>
          )}
        </div>

        {/* Step indicators */}
        <div className="flex gap-2 mb-6">
          {reviewContent.map((_, i) => (
            <button
              key={i}
              onClick={() => setReviewStep(i)}
              style={{ zIndex: 10 }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === reviewStep ? 'w-8 bg-amber-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => {
            if (reviewStep < reviewContent.length - 1) {
              setReviewStep(r => r + 1);
            } else {
              goToPhase('twist_predict');
            }
          }}
          style={{ zIndex: 10 }}
          className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl"
        >
          {reviewStep < reviewContent.length - 1 ? 'Continue \u2192' : 'Try a New Scenario \u2192'}
        </button>
      </div>
    );
  };

  const renderTwistPredict = () => {
    const predictions = [
      { id: 'seatbelt_stops', label: 'The seatbelt will stop the passenger safely', icon: '\u2705' },
      { id: 'passenger_flies', label: 'Without seatbelt, the passenger keeps moving forward', icon: '\uD83D\uDCA8' },
      { id: 'both_stop', label: 'Both car and passenger stop at the same time', icon: '\uD83D\uDED1' },
      { id: 'nothing_happens', label: 'Nothing happens to the passenger', icon: '\u2753' },
    ];

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="text-5xl mb-4">{'\uD83D\uDE97'}</div>
        <h2 className="text-2xl md:text-3xl font-bold text-indigo-400 mb-2">The Twist: Sudden Stop</h2>
        <p className="text-slate-400 mb-8 text-center max-w-md">A car is moving fast and suddenly crashes into a wall. What happens to the passenger inside?</p>

        <div className="flex flex-col gap-3 w-full max-w-md mb-8">
          {predictions.map((pred) => (
            <button
              key={pred.id}
              onClick={() => {
                setTwistPrediction(pred.id);
                playSound((pred.id === 'seatbelt_stops' || pred.id === 'passenger_flies') ? 'success' : 'click');
                emitEvent('twist_prediction_made', { twistPrediction: pred.id });
              }}
              style={{ zIndex: 10 }}
              className={`p-4 rounded-xl border-2 transition-all duration-300 flex items-center gap-4 ${
                twistPrediction === pred.id
                  ? 'border-indigo-500 bg-indigo-500/20'
                  : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50'
              }`}
            >
              <span className="text-2xl">{pred.icon}</span>
              <span className="text-white font-medium text-left">{pred.label}</span>
            </button>
          ))}
        </div>

        {twistPrediction && (
          <button
            onClick={() => goToPhase('twist_play')}
            style={{ zIndex: 10 }}
            className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
          >
            Test It {'\u2192'}
          </button>
        )}
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center px-6 py-8">
      <h2 className="text-2xl font-bold text-indigo-400 mb-2">Car Crash Simulation</h2>
      <p className="text-slate-400 mb-6">See how inertia affects passengers during a sudden stop!</p>

      {/* Simulation */}
      <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-700/50">
        <svg width="400" height="180" className="mx-auto">
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="inerTwistBgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Road gradient */}
            <linearGradient id="inerRoadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="25%" stopColor="#374151" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="75%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Wall gradient (danger) */}
            <linearGradient id="inerWallGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="25%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="75%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* Car body gradient */}
            <linearGradient id="inerCarBodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="25%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="75%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Car roof gradient */}
            <linearGradient id="inerCarRoofGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#bfdbfe" />
              <stop offset="30%" stopColor="#93c5fd" />
              <stop offset="70%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            {/* Passenger gradient (head) */}
            <radialGradient id="inerPassengerGradient" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="30%" stopColor="#fde047" />
              <stop offset="60%" stopColor="#fcd34d" />
              <stop offset="100%" stopColor="#fbbf24" />
            </radialGradient>

            {/* Seatbelt gradient */}
            <linearGradient id="inerSeatbeltGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Wheel gradient */}
            <radialGradient id="inerWheelGradient" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="40%" stopColor="#374151" />
              <stop offset="70%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </radialGradient>

            {/* Speed trail gradient */}
            <linearGradient id="inerSpeedTrailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.5" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="inerCarGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="inerWallGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="inerPassengerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="inerCarShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="3" dy="5" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
            </filter>

            {/* Status indicator gradients */}
            <linearGradient id="inerSafeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>

            <linearGradient id="inerDangerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect width="400" height="180" fill="url(#inerTwistBgGradient)" rx="12" />

          {/* Road with markings */}
          <rect x="0" y="130" width="400" height="50" fill="url(#inerRoadGradient)" />
          {/* Road edge line */}
          <line x1="0" y1="130" x2="400" y2="130" stroke="#64748b" strokeWidth="2" />
          {/* Center line (animated dashes) */}
          <line x1="0" y1="155" x2="400" y2="155" stroke="#fbbf24" strokeWidth="3" strokeDasharray="20,15">
            {carSpeed > 0 && !hasCrashed && (
              <animate attributeName="stroke-dashoffset" from="0" to="-35" dur="0.2s" repeatCount="indefinite" />
            )}
          </line>

          {/* Speed trail when moving */}
          {carSpeed > 0 && !hasCrashed && (
            <rect x="20" y="105" width={carPosition - 20} height="40" fill="url(#inerSpeedTrailGradient)" rx="4" />
          )}

          {/* Wall with glow */}
          <g filter={hasCrashed ? "url(#inerWallGlow)" : undefined}>
            <rect x="320" y="70" width="20" height="60" fill="url(#inerWallGradient)" rx="2" />
            {/* Wall texture lines */}
            <line x1="325" y1="75" x2="325" y2="125" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
            <line x1="330" y1="75" x2="330" y2="125" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
            <line x1="335" y1="75" x2="335" y2="125" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
            {/* Warning stripes */}
            {[75, 90, 105, 120].map(y => (
              <rect key={y} x="320" y={y} width="20" height="5" fill="rgba(0,0,0,0.2)" />
            ))}
          </g>

          {/* Car with premium styling */}
          <g transform={`translate(${carPosition}, 85)`} filter="url(#inerCarShadow)">
            {/* Car shadow on ground */}
            <ellipse cx="35" cy="60" rx="32" ry="5" fill="rgba(0,0,0,0.3)" />

            {/* Car body */}
            <rect x="0" y="20" width="70" height="25" fill="url(#inerCarBodyGradient)" rx="4" filter="url(#inerCarGlow)" />
            {/* Body highlight */}
            <rect x="3" y="23" width="64" height="6" fill="rgba(255,255,255,0.15)" rx="2" />

            {/* Car roof */}
            <rect x="10" y="5" width="40" height="20" fill="url(#inerCarRoofGradient)" rx="3" />

            {/* Windows with reflections */}
            <rect x="15" y="8" width="12" height="14" fill="#1e3a5a" rx="2" />
            <rect x="15" y="8" width="4" height="14" fill="rgba(255,255,255,0.1)" rx="1" />
            <rect x="33" y="8" width="12" height="14" fill="#1e3a5a" rx="2" />
            <rect x="33" y="8" width="4" height="14" fill="rgba(255,255,255,0.1)" rx="1" />

            {/* Headlights */}
            <ellipse cx="68" cy="32" rx="3" ry="4" fill="#fef08a" />
            <ellipse cx="68" cy="32" rx="2" ry="2" fill="#fef9c3" />

            {/* Wheels with 3D gradient */}
            <circle cx="15" cy="47" r="8" fill="url(#inerWheelGradient)" />
            <circle cx="15" cy="47" r="4" fill="#6b7280" />
            <circle cx="55" cy="47" r="8" fill="url(#inerWheelGradient)" />
            <circle cx="55" cy="47" r="4" fill="#6b7280" />

            {/* Passenger */}
            <g transform={`translate(${passengerPosition}, 0)`} filter="url(#inerPassengerGlow)">
              <circle cx="38" cy="15" r="7" fill="url(#inerPassengerGradient)" />
              {/* Face features */}
              <circle cx="36" cy="13" r="1" fill="#374151" />
              <circle cx="40" cy="13" r="1" fill="#374151" />
              {/* Seatbelt with gradient */}
              {seatbeltOn && !hasCrashed && (
                <line x1="30" y1="10" x2="45" y2="25" stroke="url(#inerSeatbeltGradient)" strokeWidth="3" strokeLinecap="round" />
              )}
            </g>

            {/* Impact effect when crashed */}
            {hasCrashed && (
              <>
                <circle cx="70" cy="30" r="8" fill="none" stroke="#fbbf24" strokeWidth="2" opacity="0.7">
                  <animate attributeName="r" values="8;20;8" dur="0.5s" repeatCount="3" />
                  <animate attributeName="opacity" values="0.7;0;0.7" dur="0.5s" repeatCount="3" />
                </circle>
              </>
            )}
          </g>
        </svg>
      </div>

      {/* Labels outside SVG using typo system */}
      <div className="flex justify-between w-full max-w-sm mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
          <span style={{ fontSize: typo.small }} className="text-slate-400">
            Speed: <span className="text-white font-semibold">{carSpeed} mph</span>
          </span>
        </div>
        <div className={`px-3 py-1 rounded-full text-white font-semibold ${seatbeltOn ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}
             style={{ fontSize: typo.label }}>
          {seatbeltOn ? 'BELT ON' : 'NO BELT'}
        </div>
      </div>

      {/* Result message */}
      {showCrashResult && (
        <div className={`mb-4 px-4 py-2 rounded-xl ${seatbeltOn ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
          <p style={{ fontSize: typo.body }} className={`font-semibold ${seatbeltOn ? 'text-emerald-400' : 'text-red-400'}`}>
            {seatbeltOn ? '\u2713 SAFE! Seatbelt stopped passenger!' : '\u26A0 DANGER! Passenger kept moving!'}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="w-full max-w-sm">
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/50">
          <h4 className="text-white font-medium mb-3">Seatbelt</h4>
          <div className="flex gap-2">
            <button
              onClick={() => { if (!hasCrashed) setSeatbeltOn(true); }}
              style={{ zIndex: 10 }}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                seatbeltOn
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {'\u2705'} Belt On
            </button>
            <button
              onClick={() => { if (!hasCrashed) setSeatbeltOn(false); }}
              style={{ zIndex: 10 }}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                !seatbeltOn
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {'\u274C'} No Belt
            </button>
          </div>
        </div>

        <button
          onClick={() => { if (!hasCrashed) startDriving(); }}
          disabled={hasCrashed}
          style={{ zIndex: 10 }}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
            hasCrashed
              ? 'bg-slate-700 text-slate-400'
              : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg hover:shadow-indigo-500/25'
          }`}
        >
          {hasCrashed ? '\u2713 Crashed!' : '\uD83D\uDE97 Start Driving'}
        </button>

        {showCrashResult && (
          <button
            onClick={() => {
              setCarSpeed(0);
              setCarPosition(50);
              setPassengerPosition(0);
              setHasCrashed(false);
              setShowCrashResult(false);
            }}
            style={{ zIndex: 10 }}
            className="w-full mt-3 py-3 bg-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-600"
          >
            {'\uD83D\uDD04'} Try Again
          </button>
        )}

        <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
          <p className="text-indigo-400 text-sm">{'\uD83D\uDCA1'} Try with and without seatbelt to see the difference!</p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        style={{ zIndex: 10 }}
        className="mt-6 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl"
      >
        Understand Results {'\u2192'}
      </button>
    </div>
  );

  const renderTwistReview = () => {
    const twistReviewContent = [
      {
        title: "Why Seatbelts Save Lives",
        content: "When a car suddenly stops (crash), the car's motion stops immediately. But YOUR body has inertia - it 'wants' to keep moving forward at the same speed!\n\nWithout a seatbelt, you continue forward and hit the dashboard, steering wheel, or windshield.",
      },
      {
        title: "The Seatbelt's Job",
        content: "A seatbelt provides the EXTERNAL FORCE needed to stop your body's motion.\n\nNewton's First Law: An object in motion stays in motion UNLESS acted upon by an external force.\n\nThe seatbelt is that external force - it stops your inertia safely!",
      },
      {
        title: "The Numbers Are Clear",
        content: "At 30 mph, an unbelted passenger hits the dashboard with the same force as falling from a 3-story building!\n\nSeatbelts:\n- Reduce fatal injuries by 45%\n- Reduce serious injuries by 50%\n- Have saved over 300,000 lives since 1975",
      },
    ];

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <h2 className="text-2xl md:text-3xl font-bold text-indigo-400 mb-6">The Physics of Safety</h2>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-lg w-full border border-slate-700/50 mb-6">
          <h3 className="text-xl font-bold text-indigo-400 mb-4">{twistReviewContent[twistReviewStep].title}</h3>
          <p className="text-slate-300 whitespace-pre-line leading-relaxed">{twistReviewContent[twistReviewStep].content}</p>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2 mb-6">
          {twistReviewContent.map((_, i) => (
            <button
              key={i}
              onClick={() => setTwistReviewStep(i)}
              style={{ zIndex: 10 }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === twistReviewStep ? 'w-8 bg-indigo-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => {
            if (twistReviewStep < twistReviewContent.length - 1) {
              setTwistReviewStep(t => t + 1);
            } else {
              goToPhase('transfer');
            }
          }}
          style={{ zIndex: 10 }}
          className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl"
        >
          {twistReviewStep < twistReviewContent.length - 1 ? 'Continue \u2192' : 'Real-World Examples \u2192'}
        </button>
      </div>
    );
  };

  const renderTransfer = () => {
    const allAppsCompleted = completedApps.size >= applications.length;

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-2">Inertia in Daily Life</h2>
        <p className="text-slate-400 text-sm mb-6">
          Explore all {applications.length} applications to unlock the quiz
        </p>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          {applications.map((app, index) => (
            <button
              key={index}
              onClick={() => setActiveApp(index)}
              style={{ zIndex: 10 }}
              className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                activeApp === index
                  ? 'bg-amber-500 text-white'
                  : completedApps.has(index)
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {completedApps.has(index) && '\u2713 '}{app.icon}
            </button>
          ))}
        </div>

        {/* Application Content */}
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-lg w-full border border-slate-700/50 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{applications[activeApp].icon}</span>
            <h3 className="text-xl font-bold text-white">{applications[activeApp].title}</h3>
          </div>

          <p className="text-slate-300 leading-relaxed mb-4">{applications[activeApp].description}</p>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <p className="text-amber-400 font-semibold mb-1">{'\uD83D\uDCA1'} Fun Fact</p>
            <p className="text-slate-300 text-sm">{applications[activeApp].fact}</p>
          </div>

          {!completedApps.has(activeApp) && (
            <button
              onClick={() => {
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
                playSound('complete');
                emitEvent('app_explored', { app: applications[activeApp].title });
                if (activeApp < applications.length - 1) {
                  setTimeout(() => setActiveApp(activeApp + 1), 300);
                }
              }}
              style={{ zIndex: 10 }}
              className="w-full mt-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl"
            >
              {'\u2713'} Mark as Read
            </button>
          )}

          {completedApps.has(activeApp) && (
            <div className="mt-4 py-3 bg-emerald-500/10 rounded-xl text-center">
              <span className="text-emerald-400 text-sm">{'\u2713'} Completed</span>
            </div>
          )}
        </div>

        <p className="text-slate-500 text-sm mb-4">
          {completedApps.size} of {applications.length} applications explored
        </p>

        {allAppsCompleted ? (
          <button
            onClick={() => goToPhase('test')}
            style={{ zIndex: 10 }}
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl"
          >
            Take the Quiz {'\u2192'}
          </button>
        ) : (
          <span className="text-slate-500 text-sm">Explore {applications.length - completedApps.size} more to continue</span>
        )}
      </div>
    );
  };

  const renderTest = () => {
    const question = testQuestions[currentQuestion];

    if (testComplete) {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      const passed = percentage >= 70;

      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] px-6 py-8 text-center">
          <div className="text-7xl mb-6">{passed ? '\uD83C\uDF89' : '\uD83D\uDCDA'}</div>

          <h2 className="text-3xl font-bold text-white mb-4">
            {passed ? 'Excellent Work!' : 'Keep Learning!'}
          </h2>

          <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mb-4">
            {testScore}/{testQuestions.length}
          </div>

          <p className="text-slate-400 text-lg mb-8">
            {passed ? 'You have mastered the Law of Inertia!' : 'Review the material and try again.'}
          </p>

          <button
            onClick={() => {
              if (passed) {
                goToPhase('mastery');
              } else {
                setTestComplete(false);
                setCurrentQuestion(0);
                setTestScore(0);
                setSelectedAnswer(null);
                setShowExplanation(false);
                goToPhase('review');
              }
            }}
            style={{ zIndex: 10 }}
            className={`px-8 py-4 font-semibold rounded-xl ${
              passed
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
            }`}
          >
            {passed ? 'Continue to Mastery \u2192' : 'Review Material'}
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="flex justify-between items-center w-full max-w-lg mb-4">
          <span className="text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
            Question {currentQuestion + 1} of {testQuestions.length}
          </span>
          <span className="text-sm font-bold text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full">
            Score: {testScore}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-lg h-1 bg-slate-700 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / testQuestions.length) * 100}%` }}
          />
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-lg w-full border border-slate-700/50 mb-6">
          <h3 className="text-white font-semibold mb-4 leading-relaxed">{question.question}</h3>

          <div className="flex flex-col gap-3">
            {question.options.map((option, index) => {
              let bgClass = 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50';
              let textClass = 'text-white';

              if (showExplanation) {
                if (option.correct) {
                  bgClass = 'bg-emerald-500/20 border-emerald-500';
                  textClass = 'text-emerald-400';
                } else if (index === selectedAnswer) {
                  bgClass = 'bg-red-500/20 border-red-500';
                  textClass = 'text-red-400';
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => handleTestAnswer(index)}
                  disabled={showExplanation}
                  style={{ zIndex: 10 }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${bgClass}`}
                >
                  <span className={`text-sm ${textClass}`}>{option.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {showExplanation && (
          <div className={`p-4 rounded-xl max-w-lg w-full mb-6 ${
            testQuestions[currentQuestion].options[selectedAnswer!]?.correct
              ? 'bg-emerald-500/10 border border-emerald-500/30'
              : 'bg-red-500/10 border border-red-500/30'
          }`}>
            <p className={`font-semibold mb-2 ${
              testQuestions[currentQuestion].options[selectedAnswer!]?.correct ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {testQuestions[currentQuestion].options[selectedAnswer!]?.correct ? '\u2713 Correct!' : '\u2717 Not quite'}
            </p>
            <p className="text-slate-300 text-sm">{question.explanation}</p>
          </div>
        )}

        {showExplanation && (
          <button
            onClick={() => {
              if (currentQuestion < testQuestions.length - 1) {
                setCurrentQuestion(c => c + 1);
                setSelectedAnswer(null);
                setShowExplanation(false);
              } else {
                setTestComplete(true);
              }
            }}
            style={{ zIndex: 10 }}
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl"
          >
            {currentQuestion < testQuestions.length - 1 ? 'Next Question \u2192' : 'See Results \u2192'}
          </button>
        )}
      </div>
    );
  };

  const renderMastery = () => {
    const percentage = Math.round((testScore / testQuestions.length) * 100);

    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center relative overflow-hidden">
        {/* Confetti effect */}
        <style>{`
          @keyframes confetti {
            0% { transform: translateY(0) rotate(0); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: '-20px',
              width: '10px',
              height: '10px',
              background: ['#f59e0b', '#6366f1', '#22c55e', '#10b981'][i % 4],
              borderRadius: '2px',
              animation: `confetti 3s ease-out ${Math.random() * 2}s infinite`,
            }}
          />
        ))}

        {/* Trophy */}
        <div className="w-32 h-32 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center mb-8 shadow-lg shadow-amber-500/30">
          <span className="text-6xl">{'\uD83C\uDFC6'}</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Congratulations!</h1>
        <h2 className="text-xl text-amber-400 mb-4">Inertia Master</h2>

        <p className="text-xl text-slate-400 mb-8">
          Final Score: <span className="text-emerald-400 font-bold">{testScore}/{testQuestions.length}</span> ({percentage}%)
        </p>

        {/* Key concepts */}
        <div className="grid grid-cols-2 gap-4 max-w-md w-full mb-8">
          {[
            { icon: '\u2696\uFE0F', label: 'Objects Resist Change' },
            { icon: '\uD83C\uDFCB\uFE0F', label: 'More Mass = More Inertia' },
            { icon: '\uD83D\uDE97', label: 'Seatbelts Save Lives' },
            { icon: '\uD83D\uDE80', label: 'Motion Continues Forever' },
          ].map((item, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="text-sm text-slate-400">{item.label}</div>
            </div>
          ))}
        </div>

        <p className="text-slate-500 text-sm mb-6 max-w-md">
          You now understand Newton's First Law of Motion - the Law of Inertia. Objects at rest stay at rest, and objects in motion stay in motion, unless acted upon by an external force!
        </p>

        <button
          onClick={() => {
            // Reset all state for replay
            setPhase('hook');
            setHookStep(0);
            setPrediction(null);
            setSelectedMass('light');
            setHasAppliedForce(false);
            setObjectPosition(50);
            setIsMoving(false);
            setReviewStep(0);
            setTwistPrediction(null);
            setCarSpeed(0);
            setCarPosition(50);
            setPassengerPosition(0);
            setHasCrashed(false);
            setSeatbeltOn(false);
            setShowCrashResult(false);
            setTwistReviewStep(0);
            setActiveApp(0);
            setCompletedApps(new Set());
            setCurrentQuestion(0);
            setSelectedAnswer(null);
            setShowExplanation(false);
            setTestScore(0);
            setTestComplete(false);
          }}
          style={{ zIndex: 10 }}
          className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl"
        >
          Complete Lesson {'\u2713'}
        </button>
      </div>
    );
  };

  // ==================== MAIN RENDER ====================
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

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Inertia</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-amber-400 w-6 shadow-lg shadow-amber-400/30'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-amber-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
}
