'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
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

const CentripetalForceRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
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

  const [carAngle, setCarAngle] = useState(0);
  const [speed, setSpeed] = useState(5);
  const [radius, setRadius] = useState(70);
  const [showVectors, setShowVectors] = useState(true);
  const [isAnimating, setIsAnimating] = useState(true);
  const [isSliding, setIsSliding] = useState(false);
  const [bankAngle, setBankAngle] = useState(0);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Mobile detection
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  // Phase sync
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

  const centripetalForce = (speed * speed) / radius;
  const maxFriction = 0.8;

  useEffect(() => {
    setIsSliding(centripetalForce > maxFriction * 10);
  }, [centripetalForce]);

  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setCarAngle(prev => (prev + speed * 0.5) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating, speed]);

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
      question: "Centripetal force always points:",
      options: [
        { text: "Tangent to the circle", correct: false },
        { text: "Outward from center", correct: false },
        { text: "Toward the center", correct: true },
        { text: "In direction of motion", correct: false }
      ]
    },
    {
      question: "The formula for centripetal force is:",
      options: [
        { text: "F = ma", correct: false },
        { text: "F = mv²/r", correct: true },
        { text: "F = mg", correct: false },
        { text: "F = kx", correct: false }
      ]
    },
    {
      question: "If you double the speed on a curve, the required centripetal force:",
      options: [
        { text: "Doubles", correct: false },
        { text: "Quadruples", correct: true },
        { text: "Halves", correct: false },
        { text: "Stays the same", correct: false }
      ]
    },
    {
      question: "'Centrifugal force' is:",
      options: [
        { text: "A real force pushing outward", correct: false },
        { text: "An apparent force in rotating frames", correct: true },
        { text: "Same as centripetal force", correct: false },
        { text: "A gravitational effect", correct: false }
      ]
    },
    {
      question: "What provides centripetal force for a car on a flat road?",
      options: [
        { text: "Engine power", correct: false },
        { text: "Air resistance", correct: false },
        { text: "Friction between tires and road", correct: true },
        { text: "Steering wheel", correct: false }
      ]
    },
    {
      question: "A banked curve works by using:",
      options: [
        { text: "Air lift", correct: false },
        { text: "A component of normal force", correct: true },
        { text: "Engine braking", correct: false },
        { text: "Magnetic rails", correct: false }
      ]
    },
    {
      question: "If curve radius decreases at constant speed:",
      options: [
        { text: "F_c decreases", correct: false },
        { text: "F_c increases", correct: true },
        { text: "F_c stays same", correct: false },
        { text: "Car stops", correct: false }
      ]
    },
    {
      question: "In a centrifuge, objects move outward because:",
      options: [
        { text: "Real outward force", correct: false },
        { text: "They continue straight while container curves", correct: true },
        { text: "Gravity pulls them", correct: false },
        { text: "Electric fields", correct: false }
      ]
    },
    {
      question: "At top of roller coaster loop, centripetal force is from:",
      options: [
        { text: "Friction only", correct: false },
        { text: "Normal force and gravity together", correct: true },
        { text: "Air resistance", correct: false },
        { text: "Motor", correct: false }
      ]
    },
    {
      question: "Ideal banking angle depends on:",
      options: [
        { text: "Only speed", correct: false },
        { text: "Only radius", correct: false },
        { text: "Both speed and radius", correct: true },
        { text: "Always 45°", correct: false }
      ]
    }
  ];

  const calculateScore = (): number => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  const renderCircularMotion = (showVec: boolean, size: number = 280) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const carX = centerX + Math.cos(carAngle * Math.PI / 180) * radius;
    const carY = centerY + Math.sin(carAngle * Math.PI / 180) * radius;
    const velAngle = carAngle + 90;
    const velX = Math.cos(velAngle * Math.PI / 180) * 35;
    const velY = Math.sin(velAngle * Math.PI / 180) * 35;
    const centX = (centerX - carX) / radius * 35 * Math.min(centripetalForce / 5, 2);
    const centY = (centerY - carY) / radius * 35 * Math.min(centripetalForce / 5, 2);

    return (
      <svg width={size} height={size} className="overflow-visible">
        <circle cx={centerX} cy={centerY} r={radius + 20} fill="#374151" />
        <circle cx={centerX} cy={centerY} r={radius - 20} fill="#1e293b" />
        <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="10 5" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
          <line key={angle}
            x1={centerX + Math.cos(angle * Math.PI / 180) * (radius - 15)}
            y1={centerY + Math.sin(angle * Math.PI / 180) * (radius - 15)}
            x2={centerX + Math.cos(angle * Math.PI / 180) * (radius + 15)}
            y2={centerY + Math.sin(angle * Math.PI / 180) * (radius + 15)}
            stroke="white" strokeWidth="2" />
        ))}
        {isSliding && (
          <g>
            {[1, 2, 3].map(i => (
              <circle key={i} cx={carX - centX * 0.2 * i} cy={carY - centY * 0.2 * i} r={4 - i} fill="#ef4444" opacity={0.8 - i * 0.2} />
            ))}
            <text x={carX} y={carY - 35} fill="#ef4444" fontSize="11" fontWeight="bold" textAnchor="middle">SLIDING!</text>
          </g>
        )}
        <g transform={`translate(${carX}, ${carY}) rotate(${carAngle + 90})`}>
          <rect x="-10" y="-16" width="20" height="32" rx="4" fill={isSliding ? '#ef4444' : '#3b82f6'} />
          <rect x="-8" y="-12" width="16" height="10" rx="2" fill="#93c5fd" />
          <rect x="-11" y="-14" width="5" height="7" rx="1" fill="#1f2937" />
          <rect x="6" y="-14" width="5" height="7" rx="1" fill="#1f2937" />
          <rect x="-11" y="6" width="5" height="7" rx="1" fill="#1f2937" />
          <rect x="6" y="6" width="5" height="7" rx="1" fill="#1f2937" />
        </g>
        {showVec && (
          <g>
            <line x1={carX} y1={carY} x2={carX + velX} y2={carY + velY} stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrowGreen)" />
            <text x={carX + velX * 1.2} y={carY + velY * 1.2} fill="#22c55e" fontSize="12" fontWeight="bold">v</text>
            <line x1={carX} y1={carY} x2={carX + centX} y2={carY + centY} stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrowRed)" />
            <text x={(carX + centerX) / 2 - 15} y={(carY + centerY) / 2} fill="#ef4444" fontSize="11" fontWeight="bold">F_c</text>
            <circle cx={centerX} cy={centerY} r="5" fill="#fbbf24" />
          </g>
        )}
        <defs>
          <marker id="arrowGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#22c55e" /></marker>
          <marker id="arrowRed" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#ef4444" /></marker>
        </defs>
      </svg>
    );
  };

  const renderBankedCurve = () => {
    const bankRad = bankAngle * Math.PI / 180;
    return (
      <svg width="220" height="160" className="mx-auto">
        <polygon points="20,140 200,100 200,120 20,160" fill="#4b5563" />
        <g transform={`translate(110, 110) rotate(${-bankAngle})`}>
          <rect x="-15" y="-10" width="30" height="20" rx="3" fill="#f59e0b" />
          <line x1="0" y1="-10" x2={-Math.sin(bankRad) * 40} y2={-10 - Math.cos(bankRad) * 40} stroke="#a855f7" strokeWidth="2" markerEnd="url(#arrowPurple)" />
          <text x={-Math.sin(bankRad) * 45 - 5} y={-15 - Math.cos(bankRad) * 40} fill="#a855f7" fontSize="10">N</text>
        </g>
        <line x1="110" y1="110" x2="110" y2="150" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowGreenDown)" />
        <text x="118" y="145" fill="#22c55e" fontSize="10">mg</text>
        {bankAngle > 5 && (
          <g>
            <line x1="110" y1="110" x2="70" y2="110" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" markerEnd="url(#arrowRedLeft)" />
            <text x="55" y="108" fill="#ef4444" fontSize="9">N sinθ</text>
          </g>
        )}
        <text x="110" y="155" textAnchor="middle" fill="#94a3b8" fontSize="10">Bank angle: {bankAngle}°</text>
        <defs>
          <marker id="arrowPurple" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#a855f7" /></marker>
          <marker id="arrowGreenDown" markerWidth="8" markerHeight="8" refX="3" refY="7" orient="auto"><path d="M0,0 L6,0 L3,8 z" fill="#22c55e" /></marker>
          <marker id="arrowRedLeft" markerWidth="8" markerHeight="8" refX="0" refY="3" orient="auto"><path d="M8,0 L8,6 L0,3 z" fill="#ef4444" /></marker>
        </defs>
      </svg>
    );
  };

  const applications = [
    {
      title: "Highway Engineering",
      icon: "🛣️",
      description: "Highway curves are banked to allow cars to turn safely at higher speeds without relying solely on friction.",
      details: "Engineers use θ = arctan(v²/rg) to calculate the ideal banking angle. Exit ramps have speed warnings because the banking is designed for a specific velocity.",
      animation: (
        <svg width="200" height="120" className="mx-auto">
          <path d="M10,100 Q100,20 190,100" fill="none" stroke="#4b5563" strokeWidth="35" />
          <path d="M10,100 Q100,20 190,100" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="8 4" />
          <g transform={`translate(${100 + Math.cos(carAngle * 0.02 - 1) * 60}, ${60 + Math.sin(carAngle * 0.02 - 1) * 30}) rotate(${carAngle * 0.3})`}>
            <rect x="-8" y="-5" width="16" height="10" rx="2" fill="#3b82f6" />
          </g>
          <text x="100" y="115" textAnchor="middle" fill="#94a3b8" fontSize="10">Superelevated curve</text>
        </svg>
      )
    },
    {
      title: "Roller Coaster Loops",
      icon: "🎢",
      description: "At the top of a loop, gravity and the track's normal force both point toward the center, providing centripetal force.",
      details: "Clothoid loops (teardrop shaped) keep g-forces manageable. At the top: N + mg = mv²/r, so you feel lighter but stay on track!",
      animation: (
        <svg width="200" height="120" className="mx-auto">
          <circle cx="100" cy="70" r="40" fill="none" stroke="#64748b" strokeWidth="5" />
          <g transform={`translate(${100 + Math.cos((carAngle * 2 + 90) * Math.PI / 180) * 40}, ${70 + Math.sin((carAngle * 2 + 90) * Math.PI / 180) * 40}) rotate(${carAngle * 2})`}>
            <rect x="-6" y="-4" width="12" height="8" rx="2" fill="#ef4444" />
          </g>
          <line x1="100" y1="30" x2="100" y2="45" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowGreenDown)" />
          <line x1="100" y1="30" x2="100" y2="50" stroke="#a855f7" strokeWidth="2" />
          <text x="100" y="115" textAnchor="middle" fill="#94a3b8" fontSize="10">Both forces toward center</text>
        </svg>
      )
    },
    {
      title: "Centrifuges",
      icon: "🔬",
      description: "Lab centrifuges spin samples at high speeds to separate substances by density using 'centrifugal' effects.",
      details: "In the rotating frame, denser particles experience more 'outward push' and collect at the bottom. Speeds can exceed 100,000 RPM!",
      animation: (
        <svg width="200" height="120" className="mx-auto">
          <circle cx="100" cy="60" r="40" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
          <g transform={`rotate(${carAngle * 3}, 100, 60)`}>
            <rect x="55" y="55" width="90" height="10" rx="2" fill="#94a3b8" />
            <rect x="50" y="52" width="15" height="16" rx="2" fill="#3b82f6" />
            <rect x="135" y="52" width="15" height="16" rx="2" fill="#3b82f6" />
            <rect x="52" y="60" width="11" height="6" fill="#60a5fa" />
            <rect x="137" y="60" width="11" height="6" fill="#60a5fa" />
          </g>
          <text x="100" y="115" textAnchor="middle" fill="#94a3b8" fontSize="10">High-speed separation</text>
        </svg>
      )
    },
    {
      title: "Washing Machine Spin",
      icon: "🫧",
      description: "The spin cycle uses circular motion to force water out of clothes through holes in the drum.",
      details: "Clothes press against the drum wall while water escapes through perforations. Typical spin speeds: 800-1400 RPM.",
      animation: (
        <svg width="200" height="120" className="mx-auto">
          <circle cx="100" cy="60" r="40" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(a => (
            <circle key={a} cx={100 + Math.cos(a * Math.PI / 180) * 35} cy={60 + Math.sin(a * Math.PI / 180) * 35} r="2" fill="#475569" />
          ))}
          <g transform={`rotate(${carAngle * 4}, 100, 60)`}>
            <ellipse cx="85" cy="60" rx="10" ry="8" fill="#ec4899" />
            <ellipse cx="115" cy="55" rx="8" ry="10" fill="#3b82f6" />
            <ellipse cx="105" cy="70" rx="9" ry="7" fill="#22c55e" />
          </g>
          {[0, 90, 180, 270].map(a => (
            <circle key={a} cx={100 + Math.cos((a + carAngle * 2) * Math.PI / 180) * 48} cy={60 + Math.sin((a + carAngle * 2) * Math.PI / 180) * 48} r="2" fill="#60a5fa" opacity="0.6" />
          ))}
          <text x="100" y="115" textAnchor="middle" fill="#94a3b8" fontSize="10">Water escapes outward</text>
        </svg>
      )
    }
  ];

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        The Force That Curves
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover what really happens when objects move in circles
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 rounded-3xl" />

        <div className="relative">
          {renderCircularMotion(true, 280)}

          <div className="mt-8 space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              When a car turns, you feel pushed toward the outside.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              Is there really an outward force, or is something else going on?
            </p>
            <div className="pt-2">
              <p className="text-base text-cyan-400 font-semibold">
                What force keeps the car moving in a circle?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover the Truth
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
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
          A car travels around a circular track at constant speed. In which direction is the NET force on the car?
        </p>
        {renderCircularMotion(false, 200)}
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Forward, in the direction of motion' },
          { id: 'B', text: 'Toward the center of the circle' },
          { id: 'C', text: 'Outward, away from the center' },
          { id: 'D', text: 'No net force—it\'s moving at constant speed' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400'
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
            ✓ Correct! This inward force is called <span className="text-cyan-400">centripetal force</span>—"center-seeking"!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
          >
            Explore the Physics →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Centripetal Force Lab</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderCircularMotion(showVectors, 280)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Speed: {speed.toFixed(1)}</label>
          <input type="range" min="2" max="15" step="0.5" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-full accent-blue-500" />
          <p className="text-xs text-slate-400 mt-1">Higher speed = more force needed</p>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Curve Radius: {radius}px</label>
          <input type="range" min="40" max="100" value={radius} onChange={(e) => setRadius(parseInt(e.target.value))} className="w-full accent-blue-500" />
          <p className="text-xs text-slate-400 mt-1">Tighter curve = more force needed</p>
        </div>
      </div>
      <div className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 rounded-xl p-4 max-w-2xl w-full mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className={`text-2xl font-bold ${isSliding ? 'text-red-400' : 'text-cyan-400'}`}>{centripetalForce.toFixed(2)}</div>
            <div className="text-sm text-slate-300">Required F_c</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{(maxFriction * 10).toFixed(1)}</div>
            <div className="text-sm text-slate-300">Max Friction</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${isSliding ? 'text-red-400' : 'text-emerald-400'}`}>{isSliding ? 'SLIDING' : 'GRIPPING'}</div>
            <div className="text-sm text-slate-300">Status</div>
          </div>
        </div>
      </div>
      <div className="flex gap-4 mb-6">
        <button onMouseDown={(e) => { e.preventDefault(); setIsAnimating(!isAnimating); }} className={`px-4 py-2 rounded-lg font-medium ${isAnimating ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white`}>
          {isAnimating ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); setShowVectors(!showVectors); }} className={`px-4 py-2 rounded-lg font-medium ${showVectors ? 'bg-blue-600' : 'bg-slate-600'} text-white`}>
          {showVectors ? '👁 Vectors ON' : '👁 Vectors OFF'}
        </button>
      </div>
      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-2">Key Formula: F = mv²/r</h3>
        <p className="text-slate-300 text-sm">
          <span className="text-green-400">v</span> (velocity) is tangent. <span className="text-red-400">F_c</span> points to center.
          Friction provides this force—if F_c exceeds max friction, the car slides!
        </p>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl">
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Centripetal Force</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">↪️ Centripetal Force</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• "Center-seeking"—always toward the center</li>
            <li>• F = mv²/r (mass × velocity² / radius)</li>
            <li>• Changes direction, not speed</li>
            <li>• Not a new force—provided by friction, tension, gravity, etc.</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-red-400 mb-3">↩️ "Centrifugal Force"</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• NOT a real force—it's fictitious</li>
            <li>• Only appears in rotating reference frames</li>
            <li>• You feel "pushed out" because you want to go straight</li>
            <li>• Newton's 1st Law: objects resist direction changes</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">🧮 The Physics</h3>
          <p className="text-slate-300 text-sm">
            <strong>Centripetal acceleration:</strong> a = v²/r always toward center<br />
            <strong>Newton's 2nd Law:</strong> F = ma = mv²/r<br />
            <strong>Double the speed?</strong> Requires 4× the force! (v² relationship)
          </p>
        </div>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }} className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Discover a Surprising Twist →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">🌟 The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Race tracks and highway ramps have banked (tilted) curves. At the right speed, a car can navigate the turn with zero friction.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          How does banking eliminate the need for friction?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Banking creates an outward centrifugal push' },
          { id: 'B', text: 'The car naturally goes faster on a bank' },
          { id: 'C', text: 'A component of the normal force provides centripetal force' },
          { id: 'D', text: 'Gravity is stronger on banked curves' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'C' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'C' ? 'bg-emerald-600/40 border-2 border-emerald-400'
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
            ✓ Exactly! The tilted surface redirects the normal force to have an inward component!
          </p>
          <button onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }} className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
            See How Banked Curves Work →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Banked Curve Physics</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
        {renderBankedCurve()}
      </div>
      <div className="bg-slate-700/50 rounded-xl p-4 w-full max-w-2xl mb-6">
        <label className="text-slate-300 text-sm block mb-2">Bank Angle: {bankAngle}°</label>
        <input type="range" min="0" max="45" value={bankAngle} onChange={(e) => setBankAngle(parseInt(e.target.value))} className="w-full accent-amber-500" />
      </div>
      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-amber-400 mb-3">Why Banking Works:</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• Normal force N is perpendicular to the tilted road</li>
          <li>• N has a horizontal component: <span className="text-cyan-400">N sin(θ)</span> toward center</li>
          <li>• This horizontal component provides centripetal force!</li>
          <li>• At the "design speed," friction isn't needed at all</li>
        </ul>
        <p className="text-cyan-400 mt-4 text-sm">NASCAR tracks are banked up to 33°—allowing cars to turn at 200+ mph!</p>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Review the Discovery →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">🌟 Key Discovery</h2>
      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-amber-400 mb-4">Centripetal Force Has Many Sources!</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• <strong>Flat road:</strong> Friction</li>
          <li>• <strong>Banked road:</strong> Component of normal force</li>
          <li>• <strong>Planets orbiting:</strong> Gravity</li>
          <li>• <strong>Ball on string:</strong> Tension</li>
          <li>• <strong>Roller coaster loop:</strong> Normal force ± gravity</li>
        </ul>
        <p className="text-emerald-400 font-medium mt-4">The physics is the same—F = mv²/r—but the SOURCE varies!</p>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl">
        Explore Real-World Applications →
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {applications.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index ? 'bg-blue-600 text-white'
              : completedApps.has(index) ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
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
        <p className="text-lg text-slate-300 mt-4 mb-3">{applications[activeAppTab].description}</p>
        <p className="text-sm text-slate-400">{applications[activeAppTab].details}</p>
        {!completedApps.has(activeAppTab) && (
          <button onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }} className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium">
            ✓ Mark as Understood
          </button>
        )}
      </div>
      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">{applications.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />))}</div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>
      {completedApps.size >= 4 && (
        <button onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl">
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
              <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
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
            className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(-1) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'}`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/10</h3>
          <p className="text-slate-300 mb-6">{calculateScore() >= 7 ? 'Excellent! You\'ve mastered centripetal force!' : 'Keep studying! Review and try again.'}</p>
          {calculateScore() >= 7 ? (
            <button onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }} className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl">
              Claim Your Mastery Badge →
            </button>
          ) : (
            <button onMouseDown={(e) => { e.preventDefault(); setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase(3); }} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl">
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-blue-900/50 via-cyan-900/50 to-teal-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🚗</div>
        <h1 className="text-3xl font-bold text-white mb-4">Circular Motion Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You've mastered centripetal force and circular motion!</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">↪️</div><p className="text-sm text-slate-300">Centripetal Force</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🛣️</div><p className="text-sm text-slate-300">Banked Curves</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🎢</div><p className="text-sm text-slate-300">Vertical Loops</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🔬</div><p className="text-sm text-slate-300">Centrifuges</p></div>
        </div>
        <button onMouseDown={(e) => { e.preventDefault(); goToPhase(0); }} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl">↺ Explore Again</button>
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Centripetal Force</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default CentripetalForceRenderer;
