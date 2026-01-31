'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// NEWTON'S THIRD LAW RENDERER - Premium 10-Phase Learning Experience
// ============================================================================
// Teaches Newton's Third Law: For every action, there is an equal and opposite reaction
// Features: Balloon rocket simulation, action-reaction force visualization
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

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  'hook': 'Hook',
  'predict': 'Predict',
  'play': 'Lab',
  'review': 'Review',
  'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Lab',
  'twist_review': 'Twist Review',
  'transfer': 'Transfer',
  'test': 'Test',
  'mastery': 'Mastery'
};

interface AirParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface NewtonsThirdLawRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: Phase) => void;
}

export default function NewtonsThirdLawRenderer({ onGameEvent, gamePhase, onPhaseComplete }: NewtonsThirdLawRendererProps) {
  // Core State
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  });
  const [isMobile, setIsMobile] = useState(false);

  // Hook phase
  const [hookStep, setHookStep] = useState(0);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);

  // Play phase - Balloon rocket simulation
  const [balloonSize, setBalloonSize] = useState(50);
  const [balloonX, setBalloonX] = useState(80);
  const [isLaunched, setIsLaunched] = useState(false);
  const [airRemaining, setAirRemaining] = useState(100);
  const [airParticles, setAirParticles] = useState<AirParticle[]>([]);
  const [maxDistance, setMaxDistance] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - Size comparison
  const [smallBalloonX, setSmallBalloonX] = useState(80);
  const [largeBalloonX, setLargeBalloonX] = useState(80);
  const [twistLaunched, setTwistLaunched] = useState(false);
  const [smallAir, setSmallAir] = useState(100);
  const [largeAir, setLargeAir] = useState(100);
  const twistRef = useRef<number | null>(null);

  // Twist review
  const [twistReviewStep, setTwistReviewStep] = useState(0);

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test phase
  const [testQuestions] = useState([
    {
      question: "According to Newton's Third Law, when you push against a wall, what happens?",
      options: [
        { text: "Nothing, the wall doesn't move", correct: false },
        { text: "The wall pushes back on you with equal force", correct: true },
        { text: "The wall absorbs your force", correct: false },
        { text: "Your force disappears", correct: false }
      ],
      explanation: "Newton's Third Law states that for every action, there's an equal and opposite reaction. When you push on the wall, it pushes back on you with equal force!"
    },
    {
      question: "Why does a balloon rocket move forward when air escapes backward?",
      options: [
        { text: "The air pushes on the ground", correct: false },
        { text: "The air resistance pulls it forward", correct: false },
        { text: "The escaping air pushes the balloon forward (reaction)", correct: true },
        { text: "Magic", correct: false }
      ],
      explanation: "The balloon pushes air out (action), and the air pushes the balloon forward (reaction). This is Newton's Third Law in action!"
    },
    {
      question: "If a larger balloon has more air, what happens compared to a smaller balloon?",
      options: [
        { text: "It goes slower", correct: false },
        { text: "It goes the same distance", correct: false },
        { text: "It can travel farther due to longer thrust", correct: true },
        { text: "Size doesn't matter", correct: false }
      ],
      explanation: "More air means the balloon can push air out for a longer time, providing thrust for longer and thus traveling farther."
    },
    {
      question: "When you swim, you push water backward. What is the reaction force?",
      options: [
        { text: "The water disappears", correct: false },
        { text: "The water pushes you forward", correct: true },
        { text: "Gravity pulls you down", correct: false },
        { text: "Nothing happens", correct: false }
      ],
      explanation: "When you push water backward (action), the water pushes you forward (reaction). This is how you propel yourself through water!"
    },
    {
      question: "A gun recoils (kicks back) when fired because:",
      options: [
        { text: "The gun is afraid of the noise", correct: false },
        { text: "The bullet pushes the gun backward (reaction)", correct: true },
        { text: "Air pressure pushes the gun", correct: false },
        { text: "The explosion happens twice", correct: false }
      ],
      explanation: "The gun pushes the bullet forward (action), and the bullet pushes the gun backward (reaction). The gun recoils due to Newton's Third Law."
    },
    {
      question: "Why do rockets work in the vacuum of space where there's nothing to push against?",
      options: [
        { text: "They can't work in space", correct: false },
        { text: "They push against their own exhaust gases", correct: true },
        { text: "Space isn't really a vacuum", correct: false },
        { text: "They use solar wind", correct: false }
      ],
      explanation: "Rockets push exhaust gases out (action), and those gases push the rocket forward (reaction). They don't need anything external to push against!"
    },
    {
      question: "If action and reaction forces are equal, why do objects move?",
      options: [
        { text: "They're not really equal", correct: false },
        { text: "The forces act on different objects", correct: true },
        { text: "One force is always stronger", correct: false },
        { text: "Movement is an illusion", correct: false }
      ],
      explanation: "Action and reaction forces act on DIFFERENT objects. When you push a cart, you push on the cart (it accelerates) while the cart pushes on you (but you're more massive)."
    },
    {
      question: "When a bird flaps its wings downward, what is the reaction?",
      options: [
        { text: "The air pushes the bird up", correct: true },
        { text: "The bird gets tired", correct: false },
        { text: "Nothing, birds are too light", correct: false },
        { text: "Gravity increases", correct: false }
      ],
      explanation: "The bird pushes air downward (action), and the air pushes the bird upward (reaction). This is how birds generate lift with each wing stroke!"
    },
    {
      question: "A person standing on a skateboard throws a heavy ball forward. What happens?",
      options: [
        { text: "Nothing", correct: false },
        { text: "The person rolls backward", correct: true },
        { text: "The ball stops mid-air", correct: false },
        { text: "The skateboard breaks", correct: false }
      ],
      explanation: "When the person pushes the ball forward (action), the ball pushes the person backward (reaction), causing them to roll backward on the skateboard."
    },
    {
      question: "If you're floating in space and throw your tool kit away from you, what happens?",
      options: [
        { text: "You stay still", correct: false },
        { text: "You move in the opposite direction", correct: true },
        { text: "You start spinning randomly", correct: false },
        { text: "The tool kit comes back", correct: false }
      ],
      explanation: "When you push the tool kit away (action), it pushes you in the opposite direction (reaction). This is how astronauts can move in the weightlessness of space!"
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
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
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
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Simplified navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    if (!phaseOrder.includes(newPhase)) return;
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(newPhase);
    // Reset state for play phases
    if (newPhase === 'play') {
      setBalloonX(80);
      setIsLaunched(false);
      setAirRemaining(100);
      setAirParticles([]);
      setMaxDistance(0);
    }
    if (newPhase === 'twist_play') {
      setSmallBalloonX(80);
      setLargeBalloonX(80);
      setTwistLaunched(false);
      setSmallAir(100);
      setLargeAir(100);
    }
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  // Balloon animation
  useEffect(() => {
    if (phase === 'play' && isLaunched && airRemaining > 0) {
      const animate = () => {
        setAirRemaining(prev => {
          const newAir = prev - (balloonSize / 30);
          if (newAir <= 0) return 0;
          return newAir;
        });

        setBalloonX(prev => {
          const thrust = (balloonSize / 50) * (airRemaining / 100) * 2;
          const newX = prev + thrust;
          if (newX > maxDistance) setMaxDistance(newX);
          return Math.min(newX, 700);
        });

        // Add air particles
        setAirParticles(prev => {
          const newParticles = [...prev];
          if (airRemaining > 0) {
            for (let i = 0; i < 3; i++) {
              newParticles.push({
                id: Date.now() + i,
                x: balloonX,
                y: 100 + (Math.random() - 0.5) * 20,
                vx: -5 - Math.random() * 5,
                vy: (Math.random() - 0.5) * 3,
                life: 30,
              });
            }
          }
          return newParticles
            .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 1 }))
            .filter(p => p.life > 0 && p.x > 0);
        });

        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }
  }, [phase, isLaunched, airRemaining, balloonSize, balloonX, maxDistance]);

  // Twist animation - comparing balloon sizes
  useEffect(() => {
    if (phase === 'twist_play' && twistLaunched) {
      const animate = () => {
        setSmallAir(prev => Math.max(0, prev - 3));
        setSmallBalloonX(prev => {
          if (smallAir > 0) return Math.min(prev + 1.5, 700);
          return prev;
        });

        setLargeAir(prev => Math.max(0, prev - 1.5));
        setLargeBalloonX(prev => {
          if (largeAir > 0) return Math.min(prev + 2, 700);
          return prev;
        });

        if (smallAir > 0 || largeAir > 0) {
          twistRef.current = requestAnimationFrame(animate);
        }
      };
      twistRef.current = requestAnimationFrame(animate);

      return () => {
        if (twistRef.current) cancelAnimationFrame(twistRef.current);
      };
    }
  }, [phase, twistLaunched, smallAir, largeAir]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (twistRef.current) cancelAnimationFrame(twistRef.current);
    };
  }, []);

  // Applications data
  const applications = [
    {
      title: "Rocket Propulsion",
      icon: "🚀",
      description: "Rockets work by pushing exhaust gases out the back at high speed. The gases push back on the rocket, propelling it forward. This works even in the vacuum of space because the rocket pushes against its own exhaust, not the air!",
      fact: "The Saturn V rocket produced 7.5 million pounds of thrust by expelling exhaust at 10,000+ mph!",
    },
    {
      title: "Swimming",
      icon: "🏊",
      description: "When you swim, you push water backward with your arms and legs. The water pushes you forward in response! Every swimming stroke is an action-reaction pair. The harder you push the water back, the faster you go forward.",
      fact: "Olympic swimmers can push against 60+ pounds of water with each stroke!",
    },
    {
      title: "Gun Recoil",
      icon: "🔫",
      description: "When a gun fires, the explosive gases push the bullet forward. By Newton's Third Law, the bullet (and gases) push the gun backward - this is recoil. Heavier guns recoil less because they have more mass to accelerate.",
      fact: "A .50 caliber rifle can recoil with over 100 foot-pounds of energy - enough to bruise if not held properly!",
    },
    {
      title: "Walking",
      icon: "🚶",
      description: "You walk by pushing backward against the ground with your foot. The ground pushes forward on your foot, propelling you forward! Without friction (like on ice), you can't push effectively and you slip.",
      fact: "Every step you take involves pushing against the Earth with hundreds of pounds of force. The Earth pushes back equally - that's why you move, not the planet!",
    },
  ];

  // ==================== PHASE RENDERERS ====================

  const renderHook = () => {
    const hookContent = [
      {
        title: "The Balloon Rocket",
        content: "Have you ever let go of an inflated balloon and watched it zoom across the room? What makes it fly? Today we'll discover the secret!",
        visual: "🎈",
      },
      {
        title: "Action and Reaction",
        content: "300 years ago, Isaac Newton discovered a law that explains everything from rockets to swimming to how you walk. Every push has a push back!",
        visual: "⚡",
      },
      {
        title: "From Balloons to Rockets",
        content: "The same principle that makes a balloon zoom makes rockets fly to space. Let's discover Newton's Third Law and see action-reaction pairs everywhere!",
        visual: "🚀",
      },
    ];

    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full mb-8">
          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-red-400 tracking-wide">PHYSICS EXPLORATION</span>
        </div>

        <div className="text-7xl mb-8">{hookContent[hookStep].visual}</div>

        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-red-100 to-orange-200 bg-clip-text text-transparent">
          {hookContent[hookStep].title}
        </h1>

        <p className="text-lg text-slate-400 max-w-md mb-10 leading-relaxed">
          {hookContent[hookStep].content}
        </p>

        <div className="flex items-center gap-2 mb-10">
          {hookContent.map((_, i) => (
            <button
              key={i}
              onClick={() => setHookStep(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === hookStep ? 'w-6 bg-red-500' : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
              style={{ zIndex: 10 }}
            />
          ))}
        </div>

        <button
          onClick={() => {
            if (hookStep < hookContent.length - 1) {
              setHookStep(h => h + 1);
            } else {
              goToPhase('predict');
            }
          }}
          className="group relative px-10 py-5 bg-gradient-to-r from-red-500 to-orange-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98]"
          style={{ zIndex: 10 }}
        >
          <span className="relative z-10 flex items-center gap-3">
            {hookStep < hookContent.length - 1 ? 'Continue' : 'Make a Prediction'}
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>
      </div>
    );
  };

  const renderPredict = () => {
    const predictions = [
      { id: 'air_push', label: 'The air rushing out pushes the balloon forward', icon: '💨' },
      { id: 'lighter', label: 'The balloon gets lighter and floats up', icon: '🪶' },
      { id: 'pressure', label: 'The pressure inside makes it explode forward', icon: '💥' },
      { id: 'magic', label: "The balloon just wants to move - no specific reason", icon: '✨' },
    ];

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Make Your Prediction</h2>
        <p className="text-slate-400 mb-8">Why does a balloon zoom forward when you let it go?</p>

        <div className="grid gap-3 w-full max-w-xl mb-8">
          {predictions.map((pred) => (
            <button
              key={pred.id}
              onClick={() => setPrediction(pred.id)}
              className={`p-5 rounded-xl text-left transition-all duration-300 flex items-center gap-4 ${
                prediction === pred.id
                  ? 'bg-red-500/20 border-2 border-red-500'
                  : 'bg-slate-800/50 border-2 border-transparent hover:bg-slate-700/50'
              }`}
              style={{ zIndex: 10 }}
            >
              <span className="text-2xl">{pred.icon}</span>
              <span className="text-slate-200">{pred.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => { if (prediction) goToPhase('play'); }}
          disabled={!prediction}
          className={`px-8 py-4 rounded-xl font-semibold transition-all ${
            prediction
              ? 'bg-gradient-to-r from-red-500 to-orange-600 text-white hover:shadow-lg hover:shadow-red-500/25'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
          style={{ zIndex: 10 }}
        >
          Test My Prediction →
        </button>
      </div>
    );
  };

  const renderPlay = () => {
    const displaySize = 20 + (airRemaining / 100) * (balloonSize / 100) * 20;

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Balloon Rocket Launch</h2>
        <p className="text-slate-400 mb-6">Inflate the balloon and watch it fly!</p>

        <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 w-full max-w-2xl">
          <svg width="100%" height="200" viewBox="0 0 700 200">
            <line x1="50" y1="100" x2="680" y2="100" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="5" />

            {[0, 100, 200, 300, 400, 500, 600].map(d => (
              <g key={d}>
                <line x1={50 + d} y1="95" x2={50 + d} y2="105" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                <text x={50 + d} y="125" textAnchor="middle" fill="#64748b" fontSize="10">{d}cm</text>
              </g>
            ))}

            {airParticles.map(p => (
              <circle key={p.id} cx={p.x} cy={p.y} r={3 + (p.life / 30) * 3} fill="#93c5fd" opacity={p.life / 30} />
            ))}

            <g transform={`translate(${balloonX}, 100)`}>
              <ellipse cx={displaySize / 2} cy="0" rx={displaySize} ry={displaySize * 0.8} fill="#ef4444" opacity="0.9" />
              <ellipse cx={displaySize / 2 + 5} cy="-5" rx={displaySize * 0.3} ry={displaySize * 0.2} fill="white" opacity="0.3" />
              <polygon points="0,5 -15,15 -15,-15 0,-5" fill="#dc2626" />

              {isLaunched && airRemaining > 0 && (
                <>
                  <g transform="translate(-30, 0)">
                    <line x1="0" y1="0" x2="-40" y2="0" stroke="#93c5fd" strokeWidth="3" markerEnd="url(#arrowBlue)" />
                    <text x="-20" y="-15" textAnchor="middle" fill="#93c5fd" fontSize="10" fontWeight="bold">AIR (Action)</text>
                  </g>
                  <g transform={`translate(${displaySize + 10}, 0)`}>
                    <line x1="0" y1="0" x2="40" y2="0" stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrowRed)" />
                    <text x="20" y="-15" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold">BALLOON (Reaction)</text>
                  </g>
                </>
              )}
            </g>

            <defs>
              <marker id="arrowBlue" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill="#93c5fd" />
              </marker>
              <marker id="arrowRed" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
              </marker>
            </defs>
          </svg>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
          <div className="bg-slate-700/50 rounded-xl p-4">
            <label className="text-slate-300 text-sm block mb-2">Balloon Size: {balloonSize}%</label>
            <input
              type="range"
              min="20"
              max="100"
              value={balloonSize}
              onChange={(e) => setBalloonSize(Number(e.target.value))}
              disabled={isLaunched}
              className="w-full accent-red-500"
            />
            <p className="text-xs text-slate-400 mt-1">More air = More thrust!</p>
          </div>

          <div className="bg-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-slate-400 text-xs mb-1">Distance Traveled</div>
            <div className="text-2xl font-bold text-red-400">{Math.round(balloonX - 80)} cm</div>
            <div className="text-slate-500 text-xs mt-1">Air Remaining: {Math.round(airRemaining)}%</div>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => { if (!isLaunched) setIsLaunched(true); }}
            disabled={isLaunched}
            className={`px-6 py-3 rounded-xl font-semibold ${
              isLaunched
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-500 to-orange-600 text-white hover:shadow-lg hover:shadow-red-500/25'
            }`}
            style={{ zIndex: 10 }}
          >
            {isLaunched ? '🎈 Launched!' : '🚀 Launch Balloon!'}
          </button>

          {isLaunched && (
            <button
              onClick={() => {
                setBalloonX(80);
                setIsLaunched(false);
                setAirRemaining(100);
                setAirParticles([]);
              }}
              className="px-4 py-3 rounded-xl border border-slate-600 text-slate-400 hover:bg-slate-700"
              style={{ zIndex: 10 }}
            >
              🔄 Reset
            </button>
          )}
        </div>

        <button
          onClick={() => goToPhase('review')}
          className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl"
          style={{ zIndex: 10 }}
        >
          See Results →
        </button>
      </div>
    );
  };

  const renderReview = () => {
    const wasCorrect = prediction === 'air_push';

    const reviewContent = [
      {
        title: "Newton's Third Law",
        content: `${wasCorrect ? "Excellent! You got it! " : ""}For every ACTION, there is an equal and opposite REACTION.\n\nWhen the balloon pushes air OUT (action), the air pushes the balloon FORWARD (reaction). These forces are equal in strength but opposite in direction!`,
        highlight: wasCorrect,
      },
      {
        title: "Action-Reaction Pairs",
        content: "The key insight: Action and reaction forces act on DIFFERENT objects.\n\n• The balloon pushes on the air (action)\n• The air pushes on the balloon (reaction)\n\nThey're equal in force, but because they act on different things, movement happens!",
      },
      {
        title: "Why Movement Occurs",
        content: "You might wonder: if the forces are equal, why does anything move?\n\nAnswer: The forces act on different objects! The air zooms backward (it's pushed by the balloon), and the balloon zooms forward (it's pushed by the air). Each object responds to the force on IT.",
      },
    ];

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Understanding Action & Reaction</h2>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full mb-6">
          <h3 className="text-xl font-bold text-red-400 mb-4">{reviewContent[reviewStep].title}</h3>
          <p className="text-slate-300 whitespace-pre-line leading-relaxed">{reviewContent[reviewStep].content}</p>

          {reviewContent[reviewStep].highlight && (
            <div className="mt-4 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
              <p className="text-emerald-400">✓ Great thinking! You correctly identified that the escaping air pushes the balloon forward.</p>
            </div>
          )}

          <div className="flex justify-center gap-2 mt-6">
            {reviewContent.map((_, i) => (
              <button
                key={i}
                onClick={() => setReviewStep(i)}
                className={`h-2 rounded-full transition-all ${
                  i === reviewStep ? 'w-6 bg-red-500' : 'w-2 bg-slate-600'
                }`}
                style={{ zIndex: 10 }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            if (reviewStep < reviewContent.length - 1) {
              setReviewStep(r => r + 1);
            } else {
              goToPhase('twist_predict');
            }
          }}
          className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl"
          style={{ zIndex: 10 }}
        >
          {reviewStep < reviewContent.length - 1 ? 'Continue →' : 'New Variable →'}
        </button>
      </div>
    );
  };

  const renderTwistPredict = () => {
    const predictions = [
      { id: 'small_wins', label: "The SMALLER balloon will travel farther (it's lighter!)", icon: '🎈' },
      { id: 'large_wins', label: 'The LARGER balloon will travel farther (more air!)', icon: '🎈🎈' },
      { id: 'same_distance', label: 'Both will travel the same distance', icon: '=' },
      { id: 'neither', label: "Neither will move - size doesn't matter", icon: '🤷' },
    ];

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
        <h2 className="text-2xl font-bold text-amber-400 mb-2">The Twist: Balloon Size</h2>
        <p className="text-slate-400 mb-8">If we race a small balloon against a large balloon, which travels farther?</p>

        <div className="grid gap-3 w-full max-w-xl mb-8">
          {predictions.map((pred) => (
            <button
              key={pred.id}
              onClick={() => setTwistPrediction(pred.id)}
              className={`p-5 rounded-xl text-left transition-all duration-300 flex items-center gap-4 ${
                twistPrediction === pred.id
                  ? 'bg-amber-500/20 border-2 border-amber-500'
                  : 'bg-slate-800/50 border-2 border-transparent hover:bg-slate-700/50'
              }`}
              style={{ zIndex: 10 }}
            >
              <span className="text-2xl">{pred.icon}</span>
              <span className="text-slate-200">{pred.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => { if (twistPrediction) goToPhase('twist_play'); }}
          disabled={!twistPrediction}
          className={`px-8 py-4 rounded-xl font-semibold transition-all ${
            twistPrediction
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
          style={{ zIndex: 10 }}
        >
          Test It →
        </button>
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-2">Balloon Race!</h2>
      <p className="text-slate-400 mb-6">Small balloon vs Large balloon - which wins?</p>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 w-full max-w-2xl">
        <svg width="100%" height="200" viewBox="0 0 700 200">
          <line x1="50" y1="60" x2="680" y2="60" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="5" />
          <line x1="50" y1="140" x2="680" y2="140" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="5" />

          <text x="30" y="65" fill="#64748b" fontSize="12" textAnchor="end">Small</text>
          <text x="30" y="145" fill="#64748b" fontSize="12" textAnchor="end">Large</text>

          {[0, 100, 200, 300, 400, 500, 600].map(d => (
            <g key={d}>
              <line x1={50 + d} y1="170" x2={50 + d} y2="180" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <text x={50 + d} y="195" textAnchor="middle" fill="#64748b" fontSize="10">{d}</text>
            </g>
          ))}

          <g transform={`translate(${smallBalloonX}, 60)`}>
            <ellipse cx="10" cy="0" rx={15} ry={12} fill="#3b82f6" />
            <polygon points="0,4 -8,10 -8,-10 0,-4" fill="#2563eb" />
          </g>

          <g transform={`translate(${largeBalloonX}, 140)`}>
            <ellipse cx="15" cy="0" rx={25} ry={20} fill="#ef4444" />
            <polygon points="0,6 -12,16 -12,-16 0,-6" fill="#dc2626" />
          </g>

          {(smallAir <= 0 && largeAir <= 0) && (
            <g>
              <line x1={Math.max(smallBalloonX, largeBalloonX) + 50} y1="30" x2={Math.max(smallBalloonX, largeBalloonX) + 50} y2="170" stroke="#22c55e" strokeWidth="3" strokeDasharray="10" />
              <text x={Math.max(smallBalloonX, largeBalloonX) + 60} y="100" fill="#22c55e" fontSize="14" fontWeight="bold">
                🏆 {largeBalloonX > smallBalloonX ? 'Large Wins!' : 'Small Wins!'}
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mb-6">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
          <div className="text-blue-400 font-semibold">Small Balloon</div>
          <div className="text-xl font-bold text-white">{Math.round(smallBalloonX - 80)} cm</div>
          <div className="text-slate-400 text-xs">Air: {Math.round(smallAir)}%</div>
        </div>

        <div className="flex justify-center items-center">
          <button
            onClick={() => { if (!twistLaunched) setTwistLaunched(true); }}
            disabled={twistLaunched}
            className={`px-6 py-3 rounded-xl font-semibold ${
              twistLaunched
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25'
            }`}
            style={{ zIndex: 10 }}
          >
            {twistLaunched ? '🏁 Racing!' : '🚀 Start Race!'}
          </button>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
          <div className="text-red-400 font-semibold">Large Balloon</div>
          <div className="text-xl font-bold text-white">{Math.round(largeBalloonX - 80)} cm</div>
          <div className="text-slate-400 text-xs">Air: {Math.round(largeAir)}%</div>
        </div>
      </div>

      {smallAir <= 0 && largeAir <= 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6 text-center">
          <p className="text-emerald-400 font-semibold">
            🏆 The large balloon won! It traveled {Math.round(largeBalloonX - smallBalloonX)} cm farther because it had more air to push out!
          </p>
        </div>
      )}

      <button
        onClick={() => goToPhase('twist_review')}
        className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl"
        style={{ zIndex: 10 }}
      >
        Understand Results →
      </button>
    </div>
  );

  const renderTwistReview = () => {
    const wasCorrect = twistPrediction === 'large_wins';

    const twistReviewContent = [
      {
        title: "More Air = More Thrust Time",
        content: `${wasCorrect ? "You predicted correctly! " : ""}The larger balloon travels farther because it has more air to push out. This means it can provide thrust for LONGER.\n\nRemember: It's not just about force - it's about how LONG that force acts!`,
        highlight: wasCorrect,
      },
      {
        title: "Impulse: Force × Time",
        content: "In physics, we call this IMPULSE = Force × Time.\n\nBoth balloons push with similar force, but the larger balloon pushes for longer because it has more air. More impulse = more speed = more distance!",
      },
      {
        title: "Real Rockets Use This Principle",
        content: "This is exactly why real rockets carry so much fuel! More fuel means:\n\n• Longer burn time\n• More total impulse\n• Higher final speed\n• Greater distance traveled\n\nThe Space Shuttle carried 2 million pounds of fuel!",
      },
    ];

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-amber-400 mb-6">Size Analysis</h2>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full mb-6">
          <h3 className="text-xl font-bold text-amber-400 mb-4">{twistReviewContent[twistReviewStep].title}</h3>
          <p className="text-slate-300 whitespace-pre-line leading-relaxed">{twistReviewContent[twistReviewStep].content}</p>

          {twistReviewContent[twistReviewStep].highlight && (
            <div className="mt-4 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
              <p className="text-emerald-400">✓ Excellent reasoning! You understood that more air means longer thrust and greater distance.</p>
            </div>
          )}

          <div className="flex justify-center gap-2 mt-6">
            {twistReviewContent.map((_, i) => (
              <button
                key={i}
                onClick={() => setTwistReviewStep(i)}
                className={`h-2 rounded-full transition-all ${
                  i === twistReviewStep ? 'w-6 bg-amber-500' : 'w-2 bg-slate-600'
                }`}
                style={{ zIndex: 10 }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            if (twistReviewStep < twistReviewContent.length - 1) {
              setTwistReviewStep(t => t + 1);
            } else {
              goToPhase('transfer');
            }
          }}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl"
          style={{ zIndex: 10 }}
        >
          {twistReviewStep < twistReviewContent.length - 1 ? 'Continue →' : 'Real-World Examples →'}
        </button>
      </div>
    );
  };

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-2">Newton's Third Law Everywhere</h2>
      <p className="text-slate-400 mb-6">Explore all {applications.length} applications to unlock the quiz</p>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {applications.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveApp(index)}
            className={`px-4 py-2 rounded-full font-medium transition-all ${
              activeApp === index
                ? 'bg-red-600 text-white'
                : completedApps.has(index)
                  ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            style={{ zIndex: 10 }}
          >
            {completedApps.has(index) && '✓ '}{app.icon}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{applications[activeApp].icon}</span>
          <h3 className="text-xl font-bold text-white">{applications[activeApp].title}</h3>
        </div>

        <p className="text-slate-300 mb-4 leading-relaxed">{applications[activeApp].description}</p>

        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
          <p className="text-red-400 font-medium mb-1">💡 Fun Fact:</p>
          <p className="text-slate-300 text-sm">{applications[activeApp].fact}</p>
        </div>

        {!completedApps.has(activeApp) ? (
          <button
            onClick={() => {
              const newCompleted = new Set(completedApps);
              newCompleted.add(activeApp);
              setCompletedApps(newCompleted);
            }}
            className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl"
            style={{ zIndex: 10 }}
          >
            ✓ Mark as Read
          </button>
        ) : activeApp < applications.length - 1 ? (
          <button
            onClick={() => setActiveApp(activeApp + 1)}
            className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl"
            style={{ zIndex: 10 }}
          >
            Next Application →
          </button>
        ) : null}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">
          {applications.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />
          ))}
        </div>
        <span className="text-slate-400">{completedApps.size}/{applications.length}</span>
      </div>

      {completedApps.size === applications.length && (
        <button
          onClick={() => goToPhase('test')}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl"
          style={{ zIndex: 10 }}
        >
          Take the Quiz →
        </button>
      )}
    </div>
  );

  const renderTest = () => {
    const question = testQuestions[currentQuestion];

    if (testComplete) {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      const passed = percentage >= 70;

      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
          <div className="text-6xl mb-6">{passed ? '🎉' : '📚'}</div>
          <h2 className="text-3xl font-bold text-white mb-4">{passed ? 'Excellent Work!' : 'Keep Learning!'}</h2>
          <div className={`text-5xl font-bold mb-4 ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>
            {testScore}/{testQuestions.length}
          </div>
          <p className="text-slate-400 mb-8">{passed ? "You've mastered Newton's Third Law!" : 'Review the material and try again.'}</p>

          <button
            onClick={() => {
              if (passed) {
                goToPhase('mastery');
              } else {
                setTestComplete(false);
                setCurrentQuestion(0);
                setTestScore(0);
                goToPhase('review');
              }
            }}
            className={`px-8 py-4 font-semibold rounded-xl ${
              passed
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                : 'bg-gradient-to-r from-red-500 to-orange-600 text-white'
            }`}
            style={{ zIndex: 10 }}
          >
            {passed ? 'Continue to Mastery →' : 'Review Material'}
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center p-6">
        <div className="flex justify-between items-center w-full max-w-2xl mb-6">
          <span className="text-slate-400">Question {currentQuestion + 1} of {testQuestions.length}</span>
          <span className="text-emerald-400 font-semibold">Score: {testScore}</span>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full mb-6">
          <h3 className="text-lg font-bold text-white mb-6">{question.question}</h3>

          <div className="grid gap-3">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = option.correct;
              const showResult = showExplanation;

              let className = 'p-4 rounded-xl text-left transition-all border-2 ';
              if (showResult) {
                if (isCorrect) {
                  className += 'bg-emerald-500/20 border-emerald-500';
                } else if (isSelected && !isCorrect) {
                  className += 'bg-red-500/20 border-red-500';
                } else {
                  className += 'bg-slate-700/50 border-transparent';
                }
              } else if (isSelected) {
                className += 'bg-red-500/20 border-red-500';
              } else {
                className += 'bg-slate-700/50 border-transparent hover:bg-slate-600/50';
              }

              return (
                <button
                  key={index}
                  onClick={() => { if (!showExplanation) setSelectedAnswer(index); }}
                  className={className}
                  style={{ zIndex: 10 }}
                >
                  <span className="text-slate-200">{option.text}</span>
                  {showResult && isCorrect && <span className="ml-2">✓</span>}
                  {showResult && isSelected && !isCorrect && <span className="ml-2">✗</span>}
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div className={`mt-6 p-4 rounded-xl ${testQuestions[currentQuestion].options[selectedAnswer!]?.correct ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              <p className={`font-semibold mb-2 ${testQuestions[currentQuestion].options[selectedAnswer!]?.correct ? 'text-emerald-400' : 'text-red-400'}`}>
                {testQuestions[currentQuestion].options[selectedAnswer!]?.correct ? '✓ Correct!' : '✗ Not quite'}
              </p>
              <p className="text-slate-300">{question.explanation}</p>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            if (showExplanation) {
              if (currentQuestion < testQuestions.length - 1) {
                setCurrentQuestion(c => c + 1);
                setSelectedAnswer(null);
                setShowExplanation(false);
              } else {
                setTestComplete(true);
              }
            } else {
              if (testQuestions[currentQuestion].options[selectedAnswer!]?.correct) {
                setTestScore(s => s + 1);
              }
              setShowExplanation(true);
            }
          }}
          disabled={selectedAnswer === null && !showExplanation}
          className={`px-8 py-4 rounded-xl font-semibold transition-all ${
            selectedAnswer === null && !showExplanation
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-red-500 to-orange-600 text-white hover:shadow-lg hover:shadow-red-500/25'
          }`}
          style={{ zIndex: 10 }}
        >
          {showExplanation ? (currentQuestion < testQuestions.length - 1 ? 'Next Question →' : 'See Results →') : 'Check Answer'}
        </button>
      </div>
    );
  };

  const renderMastery = () => {
    const percentage = Math.round((testScore / testQuestions.length) * 100);

    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] p-6 text-center relative overflow-hidden">
        {/* Confetti */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-sm animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-20px',
              backgroundColor: ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'][i % 5],
              animation: `fall 3s ease-out ${Math.random() * 2}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes fall {
            0% { transform: translateY(0) rotate(0); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>

        <div className="w-28 h-28 rounded-full bg-gradient-to-r from-red-500 to-orange-600 flex items-center justify-center mb-8 shadow-2xl shadow-red-500/30">
          <span className="text-6xl">🏆</span>
        </div>

        <h1 className="text-4xl font-bold text-white mb-4">Action-Reaction Master!</h1>
        <p className="text-xl text-slate-400 mb-8">
          Final Score: <span className="text-emerald-400 font-bold">{testScore}/{testQuestions.length}</span> ({percentage}%)
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-md w-full mb-8">
          {[
            { icon: '↔️', label: 'Equal & Opposite' },
            { icon: '🎈', label: 'Air Pushes Balloon' },
            { icon: '🚀', label: 'Rockets in Space' },
            { icon: '🏊', label: 'Swimming & Walking' },
          ].map((item, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-sm text-slate-400">{item.label}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => goToPhase('hook')}
          className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25"
          style={{ zIndex: 10 }}
        >
          Explore Again ↺
        </button>
      </div>
    );
  };

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

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Newton's Third Law</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-red-500 w-6 shadow-lg shadow-red-500/30'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
                style={{ zIndex: 10 }}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-red-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
}
