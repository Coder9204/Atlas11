'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// INERTIA RENDERER - Premium 10-Phase Learning Experience
// ============================================================================
// Teaches Newton's First Law: Objects at rest stay at rest, objects in motion
// stay in motion, unless acted upon by an external force.
// Classic demo: Coin-Card-Cup trick
// ============================================================================

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

const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook',
  1: 'Predict',
  2: 'Lab',
  3: 'Review',
  4: 'Twist Predict',
  5: 'Twist Lab',
  6: 'Twist Review',
  7: 'Transfer',
  8: 'Test',
  9: 'Mastery'
};

interface InertiaRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

export default function InertiaRenderer({ onGameEvent, currentPhase, onPhaseComplete }: InertiaRendererProps) {
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Core State
  const [phase, setPhase] = useState<number>(() => {
    if (currentPhase !== undefined && PHASES.includes(currentPhase)) return currentPhase;
    return 0;
  });
  const [isMobile, setIsMobile] = useState(false);

  // Hook phase
  const [hookStep, setHookStep] = useState(0);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);

  // Play phase - Coin-Card-Cup simulation
  const [flickSpeed, setFlickSpeed] = useState<'slow' | 'fast'>('fast');
  const [hasFlicked, setHasFlicked] = useState(false);
  const [cardX, setCardX] = useState(0);
  const [coinY, setCoinY] = useState(0);
  const [coinFell, setCoinFell] = useState(false);
  const [coinMissed, setCoinMissed] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - Tablecloth trick
  const [clothX, setClothX] = useState(0);
  const [dishesStayed, setDishesStayed] = useState(true);
  const [twistFlicked, setTwistFlicked] = useState(false);
  const [twistSpeed, setTwistSpeed] = useState<'slow' | 'fast'>('fast');
  const twistRef = useRef<number | null>(null);

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
      explanation: "Newton's First Law (Law of Inertia) states that an object at rest stays at rest unless acted upon by an external force. No force = no change in motion."
    },
    {
      question: "In the coin-card-cup trick, why does the coin fall straight down into the cup?",
      options: [
        { text: "The coin is magnetic", correct: false },
        { text: "The coin has inertia and resists horizontal motion", correct: true },
        { text: "Gravity is stronger on coins", correct: false },
        { text: "The cup pulls the coin", correct: false }
      ],
      explanation: "The coin has inertia - it resists changes to its state of motion. When the card is flicked away quickly, the coin 'wants' to stay still, so it drops straight down."
    },
    {
      question: "Why does a fast flick work better than a slow push for the coin trick?",
      options: [
        { text: "Fast is more fun", correct: false },
        { text: "Less time for friction to act on the coin", correct: true },
        { text: "The coin likes speed", correct: false },
        { text: "Gravity works faster", correct: false }
      ],
      explanation: "A fast flick minimizes the time friction has to transfer horizontal motion to the coin. The quicker the card leaves, the less force is transferred to the coin."
    },
    {
      question: "When a bus suddenly stops, passengers lurch forward. This is because:",
      options: [
        { text: "The bus pushes them forward", correct: false },
        { text: "Their bodies have inertia and continue moving", correct: true },
        { text: "Gravity changed direction", correct: false },
        { text: "The seats push them", correct: false }
      ],
      explanation: "Passengers' bodies were moving with the bus. When the bus stops, their bodies continue moving forward due to inertia until a force (seatbelt, seat, friction) stops them."
    },
    {
      question: "A tablecloth can be pulled from under dishes if pulled:",
      options: [
        { text: "Slowly and carefully", correct: false },
        { text: "Quickly and sharply", correct: true },
        { text: "Upward at an angle", correct: false },
        { text: "While dishes are wet", correct: false }
      ],
      explanation: "Quick motion minimizes the time friction acts on the dishes. The dishes' inertia keeps them in place if the tablecloth is pulled fast enough."
    },
    {
      question: "Why do cars have seatbelts?",
      options: [
        { text: "To look cool", correct: false },
        { text: "To stop inertia from throwing passengers forward in a crash", correct: true },
        { text: "To keep seats clean", correct: false },
        { text: "Legal requirement only", correct: false }
      ],
      explanation: "In a crash, the car stops but passengers continue moving forward due to inertia. Seatbelts provide the external force needed to stop the passenger safely."
    },
    {
      question: "A hockey puck on ice keeps sliding because:",
      options: [
        { text: "Ice is magical", correct: false },
        { text: "Very little friction = little force to change its motion", correct: true },
        { text: "The puck is afraid to stop", correct: false },
        { text: "Cold temperatures speed things up", correct: false }
      ],
      explanation: "Ice has very low friction. With almost no external force acting on the puck, it continues moving in a straight line - demonstrating Newton's First Law perfectly."
    },
    {
      question: "If you're in a car making a sharp right turn, you feel pushed to the left. This is because:",
      options: [
        { text: "The door pushes you", correct: false },
        { text: "Your body's inertia resists the change in direction", correct: true },
        { text: "Gravity shifts", correct: false },
        { text: "Wind from outside", correct: false }
      ],
      explanation: "Your body has inertia and 'wants' to continue in a straight line. The car turns right, but your body initially continues straight, making you feel 'pushed' left."
    },
    {
      question: "The coin-card trick works best when the card is:",
      options: [
        { text: "Heavy and rough", correct: false },
        { text: "Light and smooth", correct: true },
        { text: "Wet", correct: false },
        { text: "Made of metal", correct: false }
      ],
      explanation: "A smooth card has less friction with the coin. A light card requires less force to accelerate quickly. Both factors help the coin stay in place."
    },
    {
      question: "An astronaut in space throws a ball. What happens to it?",
      options: [
        { text: "It stops immediately", correct: false },
        { text: "It returns to the astronaut", correct: false },
        { text: "It keeps moving forever (in the same direction)", correct: true },
        { text: "It falls to Earth", correct: false }
      ],
      explanation: "In space, there's no air resistance or friction. With no external force to slow it down, the ball continues moving in a straight line forever - pure inertia!"
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

  // Sync with external phase
  useEffect(() => {
    if (currentPhase !== undefined && PHASES.includes(currentPhase) && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  // Sound effect with typed categories
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
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Debounced navigation
  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    if (!PHASES.includes(newPhase)) return;
    navigationLockRef.current = true;
    setPhase(newPhase);
    playSound('transition');
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(newPhase);
    // Reset state for play phases
    if (newPhase === 2) {
      setCardX(0);
      setCoinY(0);
      setHasFlicked(false);
      setCoinFell(false);
      setCoinMissed(false);
    }
    if (newPhase === 5) {
      setClothX(0);
      setTwistFlicked(false);
      setDishesStayed(true);
    }
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  // Coin-Card animation
  const flickCard = useCallback(() => {
    if (hasFlicked) return;
    setHasFlicked(true);
    playSound('click');

    const cardSpeed = flickSpeed === 'fast' ? 30 : 3;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;

      // Card moves to the right
      const newCardX = Math.min(elapsed * cardSpeed * 50, 300);
      setCardX(newCardX);

      // After card is gone, coin falls
      if (newCardX > 100) {
        if (flickSpeed === 'fast') {
          // Fast flick - coin falls straight down
          const fallTime = elapsed - (100 / (cardSpeed * 50));
          const newCoinY = Math.min(fallTime * 300, 80);
          setCoinY(newCoinY);
          if (newCoinY >= 80) {
            setCoinFell(true);
            playSound('success');
          }
        } else {
          // Slow flick - coin moves with card and misses
          const fallTime = elapsed - (100 / (cardSpeed * 50));
          const newCoinY = Math.min(fallTime * 300, 80);
          setCoinY(newCoinY);
          if (newCoinY >= 80) {
            setCoinMissed(true);
            playSound('failure');
          }
        }
      }

      if (newCardX < 300) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [hasFlicked, flickSpeed, playSound]);

  // Tablecloth animation
  const pullCloth = useCallback(() => {
    if (twistFlicked) return;
    setTwistFlicked(true);
    playSound('click');

    const clothSpeed = twistSpeed === 'fast' ? 40 : 4;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const newClothX = Math.min(elapsed * clothSpeed * 50, 400);
      setClothX(newClothX);

      if (twistSpeed === 'slow' && newClothX > 50) {
        setDishesStayed(false);
      }

      if (newClothX >= 400) {
        if (twistSpeed === 'fast') {
          playSound('success');
        } else {
          playSound('failure');
        }
      }

      if (newClothX < 400) {
        twistRef.current = requestAnimationFrame(animate);
      }
    };

    twistRef.current = requestAnimationFrame(animate);
  }, [twistFlicked, twistSpeed, playSound]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (twistRef.current) cancelAnimationFrame(twistRef.current);
    };
  }, []);

  // Calculate score helper
  const calculateScore = (): number => {
    return testScore;
  };

  // Handle test answer
  const handleTestAnswer = useCallback((answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
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
      title: "Car Safety Systems",
      icon: "\uD83D\uDE97",
      description: "Seatbelts and airbags are designed to counteract inertia. In a crash, your body continues moving forward while the car stops. Seatbelts provide the force to slow you down gradually, preventing injury.",
      fact: "Modern seatbelts have 'pretensioners' that tighten in milliseconds during a crash, reducing the distance your body travels before being restrained!",
    },
    {
      title: "Roller Coasters",
      icon: "\uD83C\uDFA2",
      description: "That feeling of being 'pushed back' during acceleration or 'thrown forward' during braking is your inertia at work! Coaster designers use inertia to create thrilling sensations while keeping riders safe.",
      fact: "The fastest roller coaster accelerates from 0-150 mph in under 5 seconds - passengers feel 1.7G of force due to their inertia!",
    },
    {
      title: "Space Travel",
      icon: "\uD83D\uDE80",
      description: "In space, there's almost no friction. Once a spacecraft reaches its velocity, it keeps moving without using fuel - pure inertia! This is how we can send probes to distant planets using minimal fuel.",
      fact: "The Voyager 1 probe, launched in 1977, is still traveling at 38,000 mph due to inertia - it hasn't used its engines in decades!",
    },
    {
      title: "Sports Physics",
      icon: "\u26BD",
      description: "Athletes use inertia constantly! A baseball pitcher's follow-through, a golfer's swing, a football player's tackle - all rely on understanding how objects (and bodies) resist changes in motion.",
      fact: "A professional pitcher's arm decelerates from 7,000 deg/second to 0 in just 0.05 seconds - requiring massive force to overcome the arm's inertia!",
    },
  ];

  // ==================== PHASE RENDERERS ====================

  const renderHook = () => {
    const hookContent = [
      {
        title: "The Magic Coin Trick",
        content: "There's a classic magic trick: Place a coin on a card on top of a cup. Flick the card away, and the coin drops perfectly into the cup! How is this possible?",
        visual: "\uD83E\uDE99",
      },
      {
        title: "The Sudden Stop",
        content: "Have you ever lurched forward when a car suddenly brakes? Or felt pushed back when it accelerates? Your body seems to have a mind of its own!",
        visual: "\uD83D\uDE97",
      },
      {
        title: "Newton's First Secret",
        content: "Isaac Newton discovered why these things happen. He called it INERTIA - the tendency of objects to resist changes in their motion. Today you'll master this principle!",
        visual: "\u2696\uFE0F",
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
              onMouseDown={(e) => {
                e.preventDefault();
                const now = Date.now();
                if (now - lastClickRef.current < 200) return;
                lastClickRef.current = now;
                setHookStep(i);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === hookStep ? 'w-8 bg-amber-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            if (hookStep < hookContent.length - 1) {
              const now = Date.now();
              if (now - lastClickRef.current < 200) return;
              lastClickRef.current = now;
              setHookStep(h => h + 1);
            } else {
              goToPhase(1);
            }
          }}
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
      { id: 'coin_falls', label: 'The coin will drop straight down into the cup', icon: '\u2B07\uFE0F' },
      { id: 'coin_flies', label: 'The coin will fly away with the card', icon: '\u27A1\uFE0F' },
      { id: 'coin_stays', label: 'The coin will hover in the air momentarily', icon: '\uD83E\uDE99' },
      { id: 'coin_spins', label: 'The coin will spin and land randomly', icon: '\uD83C\uDF00' },
    ];

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Make Your Prediction</h2>
        <p className="text-slate-400 mb-8">When you flick the card away quickly, what happens to the coin?</p>

        <div className="flex flex-col gap-3 w-full max-w-md mb-8">
          {predictions.map((pred) => (
            <button
              key={pred.id}
              onMouseDown={(e) => {
                e.preventDefault();
                const now = Date.now();
                if (now - lastClickRef.current < 200) return;
                lastClickRef.current = now;
                setPrediction(pred.id);
                playSound(pred.id === 'coin_falls' ? 'success' : 'click');
                emitEvent('prediction_made', { prediction: pred.id });
              }}
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
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
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
      <h2 className="text-2xl font-bold text-white mb-2">Coin-Card-Cup Experiment</h2>
      <p className="text-slate-400 mb-6">Flick the card and watch what happens to the coin!</p>

      {/* Simulation */}
      <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-700/50">
        <svg width="300" height="220" className="mx-auto">
          {/* Background */}
          <rect width="300" height="220" fill="#1e293b" rx="12" />

          {/* Table */}
          <rect x="0" y="180" width="300" height="40" fill="#8B4513" />

          {/* Cup */}
          <g transform="translate(130, 105)">
            <path d="M0 0 L10 75 L50 75 L60 0 Z" fill="#6366f1" opacity={0.9} />
            <ellipse cx="30" cy="0" rx="30" ry="8" fill="#6366f1" />
            <ellipse cx="30" cy="75" rx="20" ry="6" fill="#4f46e5" />
            <ellipse cx="30" cy="5" rx="22" ry="5" fill="#312e81" opacity={0.6} />
          </g>

          {/* Card (moving) */}
          {!coinFell && !coinMissed && (
            <g transform={`translate(${100 + cardX}, 70)`}>
              <rect x="0" y="0" width="80" height="10" fill="#ef4444" rx="2" />
            </g>
          )}

          {/* Coin */}
          <g transform={`translate(${flickSpeed === 'slow' && hasFlicked && cardX > 50 ? 145 + cardX * 0.3 : 145}, ${60 + coinY})`}>
            <ellipse cx="15" cy="0" rx="15" ry="4" fill="#b45309" />
            <ellipse cx="15" cy="-3" rx="15" ry="4" fill="#fcd34d" />
            <text x="15" y="0" textAnchor="middle" fill="#b45309" fontSize="10" fontWeight="bold">$</text>
          </g>

          {/* Result messages */}
          {coinFell && (
            <g>
              <text x="150" y="25" textAnchor="middle" fill="#22c55e" fontSize="16" fontWeight="bold">SUCCESS!</text>
              <text x="150" y="45" textAnchor="middle" fill="#94a3b8" fontSize="12">Coin dropped into cup!</text>
            </g>
          )}
          {coinMissed && (
            <g>
              <text x="150" y="25" textAnchor="middle" fill="#ef4444" fontSize="16" fontWeight="bold">MISSED!</text>
              <text x="150" y="45" textAnchor="middle" fill="#94a3b8" fontSize="12">Card dragged the coin!</text>
            </g>
          )}

          {/* Finger indicator */}
          {!hasFlicked && (
            <g transform="translate(90, 60)">
              <text fontSize="20">{'\uD83D\uDC46'}</text>
              <text x="-10" y="45" fill="#64748b" fontSize="10">Flick here!</text>
            </g>
          )}
        </svg>
      </div>

      {/* Controls */}
      <div className="w-full max-w-sm">
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/50">
          <h4 className="text-white font-medium mb-3">Flick Speed</h4>
          <div className="flex gap-2">
            {(['fast', 'slow'] as const).map(speed => (
              <button
                key={speed}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (!hasFlicked) setFlickSpeed(speed);
                }}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                  flickSpeed === speed
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {speed === 'fast' ? '\u26A1 Fast Flick' : '\uD83D\uDC22 Slow Push'}
              </button>
            ))}
          </div>
        </div>

        <button
          onMouseDown={(e) => { e.preventDefault(); if (!hasFlicked) flickCard(); }}
          disabled={hasFlicked && !coinFell && !coinMissed}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
            hasFlicked
              ? 'bg-slate-700 text-slate-400'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/25'
          }`}
        >
          {hasFlicked ? '\u2713 Flicked!' : '\uD83D\uDC46 Flick the Card!'}
        </button>

        {(coinFell || coinMissed) && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setCardX(0);
              setCoinY(0);
              setHasFlicked(false);
              setCoinFell(false);
              setCoinMissed(false);
            }}
            className="w-full mt-3 py-3 bg-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-600"
          >
            {'\uD83D\uDD04'} Try Again
          </button>
        )}

        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <p className="text-amber-400 text-sm">{'\uD83D\uDCA1'} Try both speeds to see the difference! Fast flick = inertia wins!</p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl"
      >
        See Results {'\u2192'}
      </button>
    </div>
  );

  const renderReview = () => {
    const wasCorrect = prediction === 'coin_falls';
    const reviewContent = [
      {
        title: "Newton's First Law of Motion",
        content: `${wasCorrect ? "You predicted correctly! " : ""}The coin drops straight down because of INERTIA.\n\nNewton's First Law states: An object at rest stays at rest, and an object in motion stays in motion, unless acted upon by an external force.`,
        highlight: wasCorrect,
      },
      {
        title: "Why the Fast Flick Works",
        content: "When you flick the card FAST:\n\n- The card leaves before friction can accelerate the coin\n- The coin's inertia keeps it in place\n- Gravity then pulls it straight down into the cup\n\nWhen you push SLOWLY, friction has time to drag the coin along!",
      },
      {
        title: "The Coin 'Wants' to Stay Still",
        content: "Inertia is the resistance to change.\n\n- The coin was at rest\n- It 'wants' to stay at rest\n- The fast-moving card doesn't give friction enough time\n- So the coin stays still horizontally and falls vertically!",
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
              <p className="text-emerald-400">{'\u2713'} Great prediction! You correctly anticipated the coin would fall straight down.</p>
            </div>
          )}
        </div>

        {/* Step indicators */}
        <div className="flex gap-2 mb-6">
          {reviewContent.map((_, i) => (
            <button
              key={i}
              onMouseDown={(e) => {
                e.preventDefault();
                const now = Date.now();
                if (now - lastClickRef.current < 200) return;
                lastClickRef.current = now;
                setReviewStep(i);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === reviewStep ? 'w-8 bg-amber-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
            />
          ))}
        </div>

        <button
          onMouseDown={(e) => {
            e.preventDefault();
            if (reviewStep < reviewContent.length - 1) {
              const now = Date.now();
              if (now - lastClickRef.current < 200) return;
              lastClickRef.current = now;
              setReviewStep(r => r + 1);
            } else {
              goToPhase(4);
            }
          }}
          className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl"
        >
          {reviewStep < reviewContent.length - 1 ? 'Continue \u2192' : 'New Experiment \u2192'}
        </button>
      </div>
    );
  };

  const renderTwistPredict = () => {
    const predictions = [
      { id: 'dishes_stay', label: 'The dishes will stay in place (inertia!)', icon: '\uD83C\uDF7D\uFE0F' },
      { id: 'dishes_fly', label: 'The dishes will fly off the table', icon: '\uD83D\uDCA8' },
      { id: 'dishes_crash', label: 'Everything will crash to the floor', icon: '\uD83D\uDCA5' },
      { id: 'cloth_tears', label: 'The tablecloth will tear', icon: '\uD83D\uDCDC' },
    ];

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="text-5xl mb-4">{'\uD83C\uDFAA'}</div>
        <h2 className="text-2xl md:text-3xl font-bold text-indigo-400 mb-2">The Twist: Tablecloth Trick</h2>
        <p className="text-slate-400 mb-8">If you quickly pull a tablecloth from under dishes, what happens?</p>

        <div className="flex flex-col gap-3 w-full max-w-md mb-8">
          {predictions.map((pred) => (
            <button
              key={pred.id}
              onMouseDown={(e) => {
                e.preventDefault();
                const now = Date.now();
                if (now - lastClickRef.current < 200) return;
                lastClickRef.current = now;
                setTwistPrediction(pred.id);
                playSound(pred.id === 'dishes_stay' ? 'success' : 'click');
                emitEvent('twist_prediction_made', { twistPrediction: pred.id });
              }}
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
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
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
      <h2 className="text-2xl font-bold text-indigo-400 mb-2">Tablecloth Trick</h2>
      <p className="text-slate-400 mb-6">Pull the tablecloth and see what happens to the dishes!</p>

      {/* Simulation */}
      <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-700/50">
        <svg width="350" height="200" className="mx-auto">
          {/* Background */}
          <rect width="350" height="200" fill="#1e293b" rx="12" />

          {/* Table */}
          <rect x="20" y="135" width="310" height="20" fill="#8B4513" />
          <rect x="30" y="155" width="20" height="45" fill="#654321" />
          <rect x="280" y="155" width="20" height="45" fill="#654321" />

          {/* Tablecloth */}
          <g transform={`translate(${-clothX}, 0)`}>
            <rect x="20" y="125" width="310" height="15" fill="#dc2626" rx="2" />
            <rect x="0" y="125" width="25" height="15" fill="#b91c1c" rx="2" />
            <path d="M20 140 L20 165 Q25 175 30 165 L30 140" fill="#dc2626" />
          </g>

          {/* Dishes - move if slow pull */}
          <g transform={`translate(${!dishesStayed ? clothX * 0.7 : 0}, ${!dishesStayed ? 15 : 0})`}>
            {/* Plate 1 */}
            <ellipse cx="80" cy="115" rx="28" ry="7" fill="#f5f5f5" />
            <ellipse cx="80" cy="113" rx="23" ry="5" fill="#e5e5e5" />

            {/* Glass */}
            <rect x="140" y="85" width="18" height="32" fill="rgba(200,200,255,0.5)" rx="3" />
            <ellipse cx="149" cy="85" rx="9" ry="4" fill="rgba(200,200,255,0.6)" />

            {/* Plate 2 */}
            <ellipse cx="220" cy="115" rx="28" ry="7" fill="#f5f5f5" />
            <ellipse cx="220" cy="113" rx="23" ry="5" fill="#e5e5e5" />

            {/* Candle */}
            <rect x="270" y="90" width="7" height="27" fill="#fff7ed" />
            <ellipse cx="273" cy="90" rx="4" ry="2" fill="#fcd34d" />
            {dishesStayed && <ellipse cx="273" cy="85" rx="3" ry="5" fill="#f97316" opacity={0.9} />}
          </g>

          {/* Result messages */}
          {twistFlicked && clothX > 350 && (
            <g>
              {dishesStayed ? (
                <>
                  <text x="175" y="35" textAnchor="middle" fill="#22c55e" fontSize="16" fontWeight="bold">INERTIA WINS!</text>
                  <text x="175" y="55" textAnchor="middle" fill="#94a3b8" fontSize="12">Dishes stayed in place!</text>
                </>
              ) : (
                <>
                  <text x="175" y="35" textAnchor="middle" fill="#ef4444" fontSize="16" fontWeight="bold">TOO SLOW!</text>
                  <text x="175" y="55" textAnchor="middle" fill="#94a3b8" fontSize="12">Friction dragged the dishes!</text>
                </>
              )}
            </g>
          )}

          {/* Pull indicator */}
          {!twistFlicked && (
            <g transform="translate(10, 130)">
              <text fontSize="16">{'\uD83D\uDC48'}</text>
              <text x="25" y="5" fill="#64748b" fontSize="10">Pull!</text>
            </g>
          )}
        </svg>
      </div>

      {/* Controls */}
      <div className="w-full max-w-sm">
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/50">
          <h4 className="text-white font-medium mb-3">Pull Speed</h4>
          <div className="flex gap-2">
            {(['fast', 'slow'] as const).map(speed => (
              <button
                key={speed}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (!twistFlicked) setTwistSpeed(speed);
                }}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                  twistSpeed === speed
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {speed === 'fast' ? '\u26A1 Quick Pull' : '\uD83D\uDC22 Slow Pull'}
              </button>
            ))}
          </div>
        </div>

        <button
          onMouseDown={(e) => { e.preventDefault(); if (!twistFlicked) pullCloth(); }}
          disabled={twistFlicked && clothX < 400}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
            twistFlicked
              ? 'bg-slate-700 text-slate-400'
              : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg hover:shadow-indigo-500/25'
          }`}
        >
          {twistFlicked ? '\u2713 Pulled!' : '\uD83D\uDC48 Pull Tablecloth!'}
        </button>

        {twistFlicked && clothX > 350 && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setClothX(0);
              setTwistFlicked(false);
              setDishesStayed(true);
            }}
            className="w-full mt-3 py-3 bg-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-600"
          >
            {'\uD83D\uDD04'} Try Again
          </button>
        )}
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="mt-6 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl"
      >
        Understand Results {'\u2192'}
      </button>
    </div>
  );

  const renderTwistReview = () => {
    const wasCorrect = twistPrediction === 'dishes_stay';
    const twistReviewContent = [
      {
        title: "Same Principle, Bigger Scale",
        content: `${wasCorrect ? "You predicted correctly! " : ""}The tablecloth trick works exactly like the coin trick!\n\nThe dishes have inertia - they resist changes to their motion. If you pull FAST enough, friction doesn't have time to accelerate them.`,
        highlight: wasCorrect,
      },
      {
        title: "Speed is the Key",
        content: "The faster you pull, the less time friction has to act.\n\nFriction force x Time = Impulse (change in momentum)\n\nShort time = Small impulse = Dishes barely move!",
      },
      {
        title: "Mass Helps Too",
        content: "Heavier objects have MORE inertia.\n\nThat's why professional magicians use heavy plates and silverware - they resist motion changes even more!\n\nF = ma means More mass = less acceleration for same force",
      },
    ];

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <h2 className="text-2xl md:text-3xl font-bold text-indigo-400 mb-6">The Physics Behind the Magic</h2>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-lg w-full border border-slate-700/50 mb-6">
          <h3 className="text-xl font-bold text-indigo-400 mb-4">{twistReviewContent[twistReviewStep].title}</h3>
          <p className="text-slate-300 whitespace-pre-line leading-relaxed">{twistReviewContent[twistReviewStep].content}</p>

          {twistReviewContent[twistReviewStep].highlight && (
            <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
              <p className="text-emerald-400">{'\u2713'} Excellent! You correctly applied inertia to the tablecloth scenario.</p>
            </div>
          )}
        </div>

        {/* Step indicators */}
        <div className="flex gap-2 mb-6">
          {twistReviewContent.map((_, i) => (
            <button
              key={i}
              onMouseDown={(e) => {
                e.preventDefault();
                const now = Date.now();
                if (now - lastClickRef.current < 200) return;
                lastClickRef.current = now;
                setTwistReviewStep(i);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === twistReviewStep ? 'w-8 bg-indigo-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
            />
          ))}
        </div>

        <button
          onMouseDown={(e) => {
            e.preventDefault();
            if (twistReviewStep < twistReviewContent.length - 1) {
              const now = Date.now();
              if (now - lastClickRef.current < 200) return;
              lastClickRef.current = now;
              setTwistReviewStep(t => t + 1);
            } else {
              goToPhase(7);
            }
          }}
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
              onMouseDown={(e) => {
                e.preventDefault();
                const now = Date.now();
                if (now - lastClickRef.current < 200) return;
                lastClickRef.current = now;
                setActiveApp(index);
              }}
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
              onMouseDown={(e) => {
                e.preventDefault();
                const now = Date.now();
                if (now - lastClickRef.current < 200) return;
                lastClickRef.current = now;
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
                playSound('complete');
                emitEvent('app_explored', { app: applications[activeApp].title });
                if (activeApp < applications.length - 1) {
                  setTimeout(() => setActiveApp(activeApp + 1), 300);
                }
              }}
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
            onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
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
            onMouseDown={(e) => {
              e.preventDefault();
              if (passed) {
                goToPhase(9);
              } else {
                setTestComplete(false);
                setCurrentQuestion(0);
                setTestScore(0);
                setSelectedAnswer(null);
                setShowExplanation(false);
                goToPhase(3);
              }
            }}
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
                  onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(index); }}
                  disabled={showExplanation}
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
            onMouseDown={(e) => {
              e.preventDefault();
              const now = Date.now();
              if (now - lastClickRef.current < 200) return;
              lastClickRef.current = now;
              if (currentQuestion < testQuestions.length - 1) {
                setCurrentQuestion(c => c + 1);
                setSelectedAnswer(null);
                setShowExplanation(false);
              } else {
                setTestComplete(true);
              }
            }}
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

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Inertia Master!</h1>

        <p className="text-xl text-slate-400 mb-8">
          Final Score: <span className="text-emerald-400 font-bold">{testScore}/{testQuestions.length}</span> ({percentage}%)
        </p>

        {/* Key concepts */}
        <div className="grid grid-cols-2 gap-4 max-w-md w-full mb-8">
          {[
            { icon: '\u2696\uFE0F', label: 'Objects Resist Change' },
            { icon: '\u26A1', label: 'Speed Beats Friction' },
            { icon: '\uD83E\uDE99', label: 'Coin Trick Mastered' },
            { icon: '\uD83D\uDE97', label: 'Inertia in Motion' },
          ].map((item, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="text-sm text-slate-400">{item.label}</div>
            </div>
          ))}
        </div>

        <button
          onMouseDown={(e) => {
            e.preventDefault();
            // Reset all state for replay
            setPhase(0);
            setHookStep(0);
            setPrediction(null);
            setFlickSpeed('fast');
            setHasFlicked(false);
            setCardX(0);
            setCoinY(0);
            setCoinFell(false);
            setCoinMissed(false);
            setReviewStep(0);
            setTwistPrediction(null);
            setClothX(0);
            setDishesStayed(true);
            setTwistFlicked(false);
            setTwistSpeed('fast');
            setTwistReviewStep(0);
            setActiveApp(0);
            setCompletedApps(new Set());
            setCurrentQuestion(0);
            setSelectedAnswer(null);
            setShowExplanation(false);
            setTestScore(0);
            setTestComplete(false);
          }}
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Inertia</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-amber-400 w-6 shadow-lg shadow-amber-400/30'
                    : phase > p
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
