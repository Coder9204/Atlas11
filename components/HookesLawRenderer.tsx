'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// HOOKE'S LAW RENDERER - PREMIUM PHYSICS GAME
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

// String-based phases
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

interface HookesLawRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// Test Questions
const testQuestions = [
  {
    scenario: "You're testing springs at a hardware store. Spring A stretches 2 cm when you hang a 100g weight. Spring B stretches 4 cm with the same weight.",
    question: "According to Hooke's Law (F = kx), which spring has the higher spring constant k?",
    options: [
      { id: 'a', label: "Spring A (stiffer spring, smaller stretch per unit force)", correct: true },
      { id: 'b', label: "Spring B (stretches more, so must be stronger)" },
      { id: 'c', label: "They have the same k (same force applied)" },
      { id: 'd', label: "Cannot determine without knowing the material" },
    ],
    explanation: "From F = kx, we get k = F/x. Both springs have the same force F (100g weight). Spring A: k = F/2cm, Spring B: k = F/4cm. Spring A has DOUBLE the spring constant because it stretches HALF as much."
  },
  {
    scenario: "A bungee cord has a spring constant of 50 N/m. A 60 kg person is attached and jumps off a platform.",
    question: "If the cord stretches 12 meters at maximum extension, what is the restoring force?",
    options: [
      { id: 'a', label: "50 N" },
      { id: 'b', label: "600 N", correct: true },
      { id: 'c', label: "4.2 N" },
      { id: 'd', label: "720 N" },
    ],
    explanation: "Hooke's Law: F = kx = 50 N/m x 12 m = 600 N. This restoring force decelerates the jumper and accelerates them back upward."
  },
  {
    scenario: "A car's suspension spring compresses 5 cm when a 200 kg load is placed on one corner.",
    question: "What is the spring constant of this suspension spring?",
    options: [
      { id: 'a', label: "1,000 N/m" },
      { id: 'b', label: "4,000 N/m" },
      { id: 'c', label: "40,000 N/m", correct: true },
      { id: 'd', label: "400,000 N/m" },
    ],
    explanation: "F = mg = 200 kg x 10 m/s^2 = 2,000 N. x = 5 cm = 0.05 m. k = F/x = 2,000 N / 0.05 m = 40,000 N/m."
  },
  {
    scenario: "You stretch a spring beyond its elastic limit. When you release it, the spring doesn't return to its original length.",
    question: "What happened to the spring?",
    options: [
      { id: 'a', label: "It gained energy and is now more powerful" },
      { id: 'b', label: "It underwent plastic deformation - the molecular bonds reorganized permanently", correct: true },
      { id: 'c', label: "It lost its spring constant entirely" },
      { id: 'd', label: "Temperature change affected its length" },
    ],
    explanation: "Beyond the elastic limit, plastic deformation occurs - molecular bonds break and reform in new positions. The spring now has a new 'rest' length."
  },
  {
    scenario: "Two identical springs (k = 100 N/m each) are connected in series (end to end) and a 10 N force is applied.",
    question: "What is the total stretch of the combined spring system?",
    options: [
      { id: 'a', label: "5 cm" },
      { id: 'b', label: "10 cm" },
      { id: 'c', label: "20 cm", correct: true },
      { id: 'd', label: "2.5 cm" },
    ],
    explanation: "In series, each spring feels the full 10 N force! Each stretches x = F/k = 10 N / 100 N/m = 0.1 m = 10 cm. Total = 20 cm."
  },
  {
    scenario: "The same two springs (k = 100 N/m each) are now connected in parallel (side by side) and the same 10 N force is applied.",
    question: "Now what is the total stretch?",
    options: [
      { id: 'a', label: "20 cm" },
      { id: 'b', label: "10 cm" },
      { id: 'c', label: "5 cm", correct: true },
      { id: 'd', label: "2.5 cm" },
    ],
    explanation: "In parallel, the force is shared! k_total = k1 + k2 = 200 N/m. Stretch x = F/k_total = 10 N / 200 N/m = 0.05 m = 5 cm."
  },
  {
    scenario: "A spring stores potential energy when compressed or stretched. A spring with k = 500 N/m is compressed by 0.1 m.",
    question: "How much elastic potential energy is stored?",
    options: [
      { id: 'a', label: "50 J" },
      { id: 'b', label: "25 J" },
      { id: 'c', label: "2.5 J", correct: true },
      { id: 'd', label: "5 J" },
    ],
    explanation: "PE = 1/2 kx^2 = 1/2 x 500 N/m x (0.1 m)^2 = 1/2 x 500 x 0.01 = 2.5 J."
  },
  {
    scenario: "A kitchen scale uses a spring to measure weight. The spring compresses 1 mm for every 100 grams placed on it.",
    question: "If you place a 1.5 kg object on the scale, how much does the spring compress?",
    options: [
      { id: 'a', label: "1.5 mm" },
      { id: 'b', label: "15 mm", correct: true },
      { id: 'c', label: "150 mm" },
      { id: 'd', label: "0.15 mm" },
    ],
    explanation: "The relationship is linear (Hooke's Law!). 1.5 kg = 1500 g = 15 x 100 g. Each 100 g causes 1 mm compression, so 15 x 1 mm = 15 mm."
  },
  {
    scenario: "A trampoline is essentially a large spring system. A child bounces higher and higher with each jump.",
    question: "During each bounce, when is the net force on the child greatest?",
    options: [
      { id: 'a', label: "At the highest point of the bounce" },
      { id: 'b', label: "When moving upward through the natural position" },
      { id: 'c', label: "At maximum compression of the trampoline surface", correct: true },
      { id: 'd', label: "The force is constant throughout" },
    ],
    explanation: "Hooke's Law: F = kx. Maximum force occurs at maximum displacement (greatest compression)."
  },
  {
    scenario: "Engineers are designing earthquake-resistant buildings. They want to use base isolation - giant springs between the building and foundation.",
    question: "Should these isolation springs be stiff (high k) or soft (low k)?",
    options: [
      { id: 'a', label: "Very stiff - to prevent any movement" },
      { id: 'b', label: "Relatively soft - to allow controlled movement and absorb energy", correct: true },
      { id: 'c', label: "Infinitely stiff - completely rigid connection" },
      { id: 'd', label: "Spring stiffness doesn't matter for earthquakes" },
    ],
    explanation: "Soft springs allow the ground to move while the building stays relatively stationary - decoupling the building from ground shaking."
  }
];

// Real-World Applications
const realWorldApps = [
  {
    icon: '🚗',
    title: 'Vehicle Suspension Systems',
    tagline: 'Springs Absorb the Road',
    description: 'Every vehicle from bicycles to trains relies on spring-based suspension to absorb bumps and provide comfortable, controlled rides.',
    connection: 'The spring constant experiment shows how different k values affect displacement. Car engineers tune suspension springs to balance comfort (soft springs) and handling (stiff springs).',
    stats: [
      { value: '40,000', label: 'N/m typical car spring', icon: '🔧' },
      { value: '10 cm', label: 'Typical travel', icon: '📏' },
      { value: '$45B', label: 'Suspension market', icon: '💰' }
    ],
    color: '#22c55e'
  },
  {
    icon: '⌚',
    title: 'Mechanical Watches & Clocks',
    tagline: 'Springs Measure Time',
    description: 'Mechanical watches use a tiny coiled spring (hairspring) whose oscillations follow Hooke\'s Law, providing remarkably accurate timekeeping without batteries.',
    connection: 'The oscillation period of a spring-mass system (T = 2pi*sqrt(m/k)) means that the spring\'s stiffness directly determines how fast the watch ticks.',
    stats: [
      { value: '0.05mm', label: 'Hairspring thickness', icon: '🔍' },
      { value: '+/-2 sec', label: 'Daily accuracy', icon: '⏱️' },
      { value: '$50B', label: 'Luxury watch market', icon: '💎' }
    ],
    color: '#14b8a6'
  },
  {
    icon: '🏗️',
    title: 'Structural Engineering',
    tagline: 'Elastic Design Saves Lives',
    description: 'Hooke\'s Law governs how buildings and bridges respond to loads. Engineers ensure structures stay within elastic limits under expected forces.',
    connection: 'The elastic limit demonstration shows what happens when materials are overstressed. Structural engineers design with safety factors to ensure elastic behavior.',
    stats: [
      { value: '200 GPa', label: 'Steel elastic modulus', icon: '🔩' },
      { value: '2-3x', label: 'Typical safety factor', icon: '🛡️' },
      { value: '$12T', label: 'Global construction', icon: '🌍' }
    ],
    color: '#f59e0b'
  },
  {
    icon: '🏃',
    title: 'Sports & Athletic Equipment',
    tagline: 'Energy Return Systems',
    description: 'From running shoes to pole vaults, athletic equipment exploits elastic energy storage and return to enhance human performance.',
    connection: 'The elastic potential energy formula (PE = 1/2 kx^2) shows how compressed or stretched materials store energy that can be returned to the athlete.',
    stats: [
      { value: '85%+', label: 'Nike Air energy return', icon: '👟' },
      { value: '6m+', label: 'Pole vault records', icon: '🏅' },
      { value: '$180B', label: 'Sporting goods market', icon: '📊' }
    ],
    color: '#3b82f6'
  }
];

const HookesLawRenderer: React.FC<HookesLawRendererProps> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
  // Core State
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [testQuestion, setTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Experiment state
  const [springConstant, setSpringConstant] = useState(50);
  const [appliedForce, setAppliedForce] = useState(10);
  const [isOscillating, setIsOscillating] = useState(false);
  const [showForceArrows, setShowForceArrows] = useState(true);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Phase sync
  useEffect(() => {
    if (gamePhase !== undefined && gamePhase !== phase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => setTime(t => t + 0.03), 30);
    return () => clearInterval(interval);
  }, []);

  // Sound system
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
    if (onGameEvent) onGameEvent({ type, data });
  }, [onGameEvent]);

  // Phase navigation - simplified without locks
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { phase: newPhase, phaseLabel: phaseLabels[newPhase] });
    if (onPhaseComplete) onPhaseComplete(newPhase);
  }, [playSound, onPhaseComplete, emitEvent]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Calculations
  const displacement = appliedForce / springConstant;
  const oscillationDisp = isOscillating ? displacement * Math.sin(time * 5) : displacement;
  const elasticPE = 0.5 * springConstant * displacement * displacement;

  // Test score
  const calculateTestScore = () => {
    return testAnswers.reduce((score, ans, i) => {
      const correct = testQuestions[i].options.find(o => o.correct)?.id;
      return score + (ans === correct ? 1 : 0);
    }, 0);
  };

  // Progress Bar
  const ProgressBar = () => (
    <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
      <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
        <span className="text-sm font-semibold text-white/80 tracking-wide">Hooke's Law</span>
        <div className="flex items-center gap-1.5">
          {phaseOrder.map((p) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              style={{ zIndex: 10 }}
              className={`h-2 rounded-full transition-all duration-300 ${
                phase === p
                  ? 'bg-emerald-400 w-6 shadow-lg shadow-emerald-400/30'
                  : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                    ? 'bg-emerald-500 w-2'
                    : 'bg-slate-700 w-2 hover:bg-slate-600'
              }`}
              title={phaseLabels[p]}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-emerald-400">{phaseLabels[phase]}</span>
      </div>
    </div>
  );

  // Spring Visualization
  const SpringVisualization = () => {
    const baseY = 50;
    const restLength = 100;
    const stretchAmount = oscillationDisp * 200;
    const currentLength = restLength + stretchAmount;
    const coils = 12;

    const springPath = () => {
      let path = `M 200 ${baseY}`;
      const coilHeight = currentLength / coils;
      const amplitude = 20;
      for (let i = 0; i < coils; i++) {
        const y1 = baseY + i * coilHeight + coilHeight / 4;
        const y2 = baseY + i * coilHeight + coilHeight / 2;
        const y3 = baseY + i * coilHeight + coilHeight * 3 / 4;
        const y4 = baseY + (i + 1) * coilHeight;
        path += ` Q ${200 + amplitude} ${y1} 200 ${y2}`;
        path += ` Q ${200 - amplitude} ${y3} 200 ${y4}`;
      }
      return path;
    };

    return (
      <svg viewBox="0 0 400 350" className="w-full max-h-[350px]">
        <defs>
          <linearGradient id="springGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <filter id="springGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width="400" height="350" fill="#0f172a" />
        <rect x="150" y="30" width="100" height="20" fill="#475569" rx="3" />

        <path d={springPath()} fill="none" stroke="url(#springGrad)" strokeWidth="4" strokeLinecap="round" filter="url(#springGlow)" />

        <rect x="160" y={baseY + currentLength} width="80" height="50" rx="8" fill="#475569" stroke="#22c55e" strokeWidth="2" />
        <text x="200" y={baseY + currentLength + 30} textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold">
          {(appliedForce / 10).toFixed(1)} kg
        </text>

        {showForceArrows && (
          <>
            <line x1="200" y1={baseY + currentLength + 55} x2="200" y2={baseY + currentLength + 55 + appliedForce * 2} stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrowDown)" />
            <text x="230" y={baseY + currentLength + 70} fill="#ef4444" fontSize="10" fontWeight="bold">W = {appliedForce.toFixed(0)} N</text>

            <line x1="200" y1={baseY + currentLength - 5} x2="200" y2={baseY + currentLength - 5 - appliedForce * 2} stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrowUp)" />
            <text x="230" y={baseY + currentLength - 30} fill="#22c55e" fontSize="10" fontWeight="bold">F = kx = {appliedForce.toFixed(0)} N</text>
          </>
        )}

        <line x1="270" y1={baseY + restLength} x2="330" y2={baseY + restLength} stroke="#334155" strokeWidth="1" strokeDasharray="4" />
        <line x1="270" y1={baseY + currentLength + 25} x2="330" y2={baseY + currentLength + 25} stroke="#14b8a6" strokeWidth="1" strokeDasharray="4" />

        {stretchAmount > 10 && (
          <>
            <line x1="300" y1={baseY + restLength} x2="300" y2={baseY + currentLength + 25} stroke="#14b8a6" strokeWidth="2" />
            <text x="310" y={baseY + (restLength + currentLength) / 2 + 15} fill="#14b8a6" fontSize="11" fontWeight="bold">
              x = {(displacement * 100).toFixed(1)} cm
            </text>
          </>
        )}

        <text x="350" y={baseY + restLength + 4} textAnchor="end" fill="#64748b" fontSize="9">Rest position</text>

        <rect x="20" y="250" width="150" height="80" rx="8" fill="#1e293b" stroke="#334155" />
        <text x="35" y="270" fill="#64748b" fontSize="9">Spring Constant (k)</text>
        <text x="35" y="285" fill="#22c55e" fontSize="14" fontWeight="bold">{springConstant} N/m</text>
        <text x="35" y="305" fill="#64748b" fontSize="9">Potential Energy</text>
        <text x="35" y="320" fill="#f59e0b" fontSize="14" fontWeight="bold">{elasticPE.toFixed(2)} J</text>

        <defs>
          <marker id="arrowDown" markerWidth="10" markerHeight="10" refX="5" refY="0" orient="auto">
            <path d="M0,0 L5,10 L10,0 L5,3 Z" fill="#ef4444" />
          </marker>
          <marker id="arrowUp" markerWidth="10" markerHeight="10" refX="5" refY="10" orient="auto">
            <path d="M0,10 L5,0 L10,10 L5,7 Z" fill="#22c55e" />
          </marker>
        </defs>
      </svg>
    );
  };

  // ============================================================================
  // PHASE: HOOK
  // ============================================================================
  if (phase === 'hook') {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/3 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-16 pb-12">
          <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-emerald-400 tracking-wide">MECHANICS</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-emerald-100 to-teal-200 bg-clip-text text-transparent">
              Hooke's Law: F = kx
            </h1>

            <p className="text-lg text-slate-400 max-w-md mb-10">
              Discover the beautifully simple law that governs all springs
            </p>

            <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 rounded-3xl" />

              <div className="relative">
                <p className="text-xl text-white/90 font-medium leading-relaxed mb-6">
                  Springs are everywhere - in your mattress, your car, even your watch.
                </p>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { icon: '🔧', label: 'Spring Lab' },
                    { icon: '📐', label: 'F = kx' },
                    { icon: '🚗', label: 'Real World' },
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <div className="text-2xl mb-2">{item.icon}</div>
                      <div className="text-xs text-slate-400">{item.label}</div>
                    </div>
                  ))}
                </div>

                <p className="text-lg text-slate-400 leading-relaxed">
                  The law that governs them all is remarkably simple...
                </p>
              </div>
            </div>

            <button
              onClick={() => goToPhase('predict')}
              style={{ zIndex: 10 }}
              className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center gap-3">
                Discover the Law
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>

            <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">*</span>
                Interactive Lab
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">*</span>
                Real-World Examples
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">*</span>
                Knowledge Test
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: PREDICT
  // ============================================================================
  if (phase === 'predict') {
    const predictions = [
      { id: 'half', label: '2.5 cm (half as much)', desc: 'Heavier objects compress springs more tightly' },
      { id: 'same', label: '5 cm (same amount)', desc: 'Springs have a fixed maximum stretch' },
      { id: 'double', label: '10 cm (double the stretch)', desc: 'Double the force = double the displacement', correct: true },
      { id: 'quad', label: '20 cm (quadruple)', desc: 'Stretch increases with the square of force' },
    ];

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">Your Prediction</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mt-2 mb-3">
                How Do Springs Respond?
              </h2>
              <p className="text-slate-400">You hang 1 kg on a spring and it stretches 5 cm. If you hang 2 kg, how much will it stretch?</p>
            </div>

            <div className="flex flex-col gap-3 mb-8">
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{ zIndex: 10 }}
                  className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 ${
                    prediction === p.id
                      ? 'bg-emerald-500/20 border-2 border-emerald-500'
                      : 'bg-slate-800/50 border-2 border-transparent hover:bg-slate-700/50'
                  }`}
                >
                  <div>
                    <div className={`font-semibold ${prediction === p.id ? 'text-emerald-400' : 'text-white'}`}>
                      {p.label}
                    </div>
                    <div className="text-sm text-slate-400">{p.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => goBack()}
                style={{ zIndex: 10 }}
                className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => { if (prediction) goToPhase('play'); }}
                disabled={!prediction}
                style={{ zIndex: 10 }}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                  prediction
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                Test the Spring
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: PLAY (Spring Lab)
  // ============================================================================
  if (phase === 'play') {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">Spring Lab</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">Hooke's Law Explorer</h2>
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 mb-6">
              <SpringVisualization />
            </div>

            <div className={`grid gap-4 mb-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex justify-between mb-2">
                  <span className="text-emerald-400 font-semibold">Applied Force</span>
                  <span className="text-white font-bold">{appliedForce} N</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={appliedForce}
                  onChange={(e) => setAppliedForce(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex justify-between mb-2">
                  <span className="text-teal-400 font-semibold">Spring Constant</span>
                  <span className="text-white font-bold">{springConstant} N/m</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="200"
                  value={springConstant}
                  onChange={(e) => setSpringConstant(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mb-6 justify-center">
              <button
                onClick={() => setShowForceArrows(!showForceArrows)}
                style={{ zIndex: 10 }}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  showForceArrows
                    ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400'
                    : 'bg-slate-800/50 border-2 border-transparent text-slate-400'
                }`}
              >
                {showForceArrows ? 'Hide' : 'Show'} Forces
              </button>
              <button
                onClick={() => setIsOscillating(!isOscillating)}
                style={{ zIndex: 10 }}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  isOscillating
                    ? 'bg-amber-500/20 border-2 border-amber-500 text-amber-400'
                    : 'bg-slate-800/50 border-2 border-transparent text-slate-400'
                }`}
              >
                {isOscillating ? 'Stop' : 'Start'} Oscillation
              </button>
            </div>

            <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30 mb-6 text-center">
              <p className="text-lg font-bold text-emerald-400 mb-1">F = kx</p>
              <p className="text-sm text-slate-400">Force = Spring Constant x Displacement</p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => goBack()}
                style={{ zIndex: 10 }}
                className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => goNext()}
                style={{ zIndex: 10 }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl"
              >
                Understand the Physics
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: REVIEW
  // ============================================================================
  if (phase === 'review') {
    const userWasRight = prediction === 'double';

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">{userWasRight ? '🎯' : '💡'}</div>
              <h2 className={`text-2xl md:text-3xl font-bold mb-2 ${userWasRight ? 'text-emerald-400' : 'text-emerald-400'}`}>
                {userWasRight ? 'Exactly Right!' : 'The Linear Relationship!'}
              </h2>
              <p className="text-slate-400">Double the force = double the stretch</p>
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 mb-6">
              <div className="bg-slate-900/50 rounded-xl p-4 text-center mb-4">
                <p className="text-3xl font-bold text-emerald-400 mb-1">F = kx</p>
                <p className="text-sm text-slate-500">Force = Spring Constant x Displacement</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30 text-center">
                  <div className="text-lg font-bold text-emerald-400 mb-1">k = F/x</div>
                  <div className="text-sm text-slate-400">Higher k = stiffer spring</div>
                </div>
                <div className="bg-teal-500/10 rounded-xl p-4 border border-teal-500/30 text-center">
                  <div className="text-lg font-bold text-teal-400 mb-1">PE = 1/2 kx^2</div>
                  <div className="text-sm text-slate-400">Energy stored in spring</div>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {[
                { icon: '📏', title: 'Linearity', text: 'Double the force = double the stretch. Triple = triple. Perfectly linear!' },
                { icon: '🔧', title: 'Spring Constant k', text: 'Measures stiffness. High k = hard to stretch. Low k = easy to stretch.' },
                { icon: '⚠️', title: 'Elastic Limit', text: 'Only works up to a point! Beyond the elastic limit, springs deform permanently.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <div className="font-semibold text-white">{item.title}</div>
                    <div className="text-sm text-slate-400">{item.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => goBack()}
                style={{ zIndex: 10 }}
                className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => goNext()}
                style={{ zIndex: 10 }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl"
              >
                The Elastic Limit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TWIST PREDICT
  // ============================================================================
  if (phase === 'twist_predict') {
    const twistOptions = [
      { id: 'break', label: 'The spring breaks immediately' },
      { id: 'same', label: 'Nothing - springs can stretch infinitely' },
      { id: 'deform', label: 'The spring deforms permanently - it won\'t return to original length', correct: true },
      { id: 'stronger', label: 'The spring becomes stronger' },
    ];

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">Twist Challenge</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mt-2 mb-3">
                What Happens Beyond the Limit?
              </h2>
              <p className="text-slate-400">You keep adding weight to a spring, stretching it more and more. What happens when you exceed the elastic limit?</p>
            </div>

            <div className="flex flex-col gap-3 mb-8">
              {twistOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTwistPrediction(opt.id)}
                  style={{ zIndex: 10 }}
                  className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 ${
                    twistPrediction === opt.id
                      ? 'bg-amber-500/20 border-2 border-amber-500'
                      : 'bg-slate-800/50 border-2 border-transparent hover:bg-slate-700/50'
                  }`}
                >
                  <span className={`font-semibold ${twistPrediction === opt.id ? 'text-amber-400' : 'text-white'}`}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => goBack()}
                style={{ zIndex: 10 }}
                className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => { if (twistPrediction) goNext(); }}
                disabled={!twistPrediction}
                style={{ zIndex: 10 }}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                  twistPrediction
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                See What Happens
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TWIST PLAY
  // ============================================================================
  if (phase === 'twist_play') {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">Beyond the Limit</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">Plastic Deformation</h2>
            </div>

            {/* Stress-Strain Curve */}
            <svg viewBox="0 0 400 250" className="w-full max-h-[250px] mb-6">
              <rect width="400" height="250" fill="#0f172a" />
              <line x1="50" y1="200" x2="380" y2="200" stroke="#334155" strokeWidth="2" />
              <line x1="50" y1="200" x2="50" y2="30" stroke="#334155" strokeWidth="2" />
              <text x="220" y="230" textAnchor="middle" fill="#64748b" fontSize="12">Strain (Displacement)</text>
              <text x="20" y="120" textAnchor="middle" fill="#64748b" fontSize="12" transform="rotate(-90, 20, 120)">Stress (Force)</text>
              <path d="M 50 200 L 150 100" stroke="#22c55e" strokeWidth="3" fill="none" />
              <text x="90" y="140" fill="#22c55e" fontSize="10" fontWeight="bold">Linear (Hooke's Law)</text>
              <circle cx="150" cy="100" r="6" fill="#f59e0b" />
              <text x="150" y="85" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">Elastic Limit</text>
              <path d="M 150 100 Q 220 60 280 70" stroke="#ef4444" strokeWidth="3" fill="none" />
              <text x="220" y="55" fill="#ef4444" fontSize="10" fontWeight="bold">Plastic Deformation</text>
              <circle cx="280" cy="70" r="6" fill="#ef4444" />
              <text x="280" y="50" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold">Fracture</text>
              <path d="M 200 85 L 120 200" stroke="#64748b" strokeWidth="2" strokeDasharray="5" fill="none" />
              <text x="170" y="170" fill="#64748b" fontSize="9">Permanent deformation</text>
            </svg>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
                <p className="font-semibold text-emerald-400 mb-2">Elastic Region</p>
                <p className="text-sm text-slate-400">F = kx applies. Remove force = returns to original shape.</p>
              </div>
              <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
                <p className="font-semibold text-red-400 mb-2">Plastic Region</p>
                <p className="text-sm text-slate-400">Beyond elastic limit. Permanent deformation. Bonds break and reform.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => goBack()}
                style={{ zIndex: 10 }}
                className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => goNext()}
                style={{ zIndex: 10 }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl"
              >
                Key Insight
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TWIST REVIEW
  // ============================================================================
  if (phase === 'twist_review') {
    const userWasRight = twistPrediction === 'deform';

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">{userWasRight ? '🎯' : '💡'}</div>
              <h2 className={`text-2xl md:text-3xl font-bold mb-2 ${userWasRight ? 'text-emerald-400' : 'text-amber-400'}`}>
                {userWasRight ? 'Exactly!' : 'Elastic vs Plastic'}
              </h2>
            </div>

            <div className="space-y-4 mb-6">
              {[
                { icon: '🔬', title: 'Molecular Basis', text: 'In the elastic region, atoms are displaced but bonds stretch - not break. In plastic region, bonds break and reform.' },
                { icon: '🏗️', title: 'Engineering Design', text: 'Structures must stay well within elastic limits under normal loads. Safety factors ensure we never approach plastic deformation.' },
                { icon: '🔨', title: 'Useful Deformation', text: 'Sometimes we WANT plastic deformation: bending metal into shapes, car crumple zones absorbing crash energy.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <div className="font-semibold text-white">{item.title}</div>
                    <div className="text-sm text-slate-400">{item.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => goBack()}
                style={{ zIndex: 10 }}
                className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => goNext()}
                style={{ zIndex: 10 }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl"
              >
                Real World Applications
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TRANSFER (Real World Applications)
  // ============================================================================
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allCompleted = completedApps.size >= realWorldApps.length;

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">Real-World Applications</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">Springs Everywhere</h2>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {realWorldApps.map((a, idx) => {
                const isCompleted = completedApps.has(idx);
                const isCurrent = idx === selectedApp;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedApp(idx)}
                    style={{ zIndex: 10 }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                      isCurrent
                        ? 'text-white'
                        : isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500'
                          : 'bg-slate-800/50 text-slate-400'
                    }`}
                    style={isCurrent ? { background: a.color, zIndex: 10 } : { zIndex: 10 }}
                  >
                    {isCompleted ? '✓' : a.icon} {a.title.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl" style={{ background: `${app.color}30` }}>
                  {app.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{app.title}</h3>
                  <p className="text-sm" style={{ color: app.color }}>{app.tagline}</p>
                </div>
              </div>

              <p className="text-slate-300 mb-4">{app.description}</p>

              <div className="rounded-xl p-4 mb-4 border" style={{ background: `${app.color}15`, borderColor: `${app.color}40` }}>
                <p className="font-semibold mb-1" style={{ color: app.color }}>Physics Connection</p>
                <p className="text-sm text-slate-400">{app.connection}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {app.stats.map((stat, i) => (
                  <div key={i} className="bg-slate-900/50 rounded-lg p-3 text-center">
                    <span className="text-lg">{stat.icon}</span>
                    <div className="font-bold" style={{ color: app.color }}>{stat.value}</div>
                    <div className="text-xs text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </div>

              {!completedApps.has(selectedApp) ? (
                <button
                  onClick={() => {
                    const newCompleted = new Set(completedApps);
                    newCompleted.add(selectedApp);
                    setCompletedApps(newCompleted);
                    playSound('complete');
                  }}
                  style={{ background: app.color, zIndex: 10 }}
                  className="w-full py-3 rounded-xl font-semibold text-white"
                >
                  Mark as Understood
                </button>
              ) : (
                <div className="w-full py-3 rounded-xl font-semibold text-emerald-400 bg-emerald-500/20 border border-emerald-500 text-center">
                  Completed
                </div>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => goBack()}
                style={{ zIndex: 10 }}
                className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
              {selectedApp < realWorldApps.length - 1 ? (
                <button
                  onClick={() => setSelectedApp(selectedApp + 1)}
                  style={{ zIndex: 10 }}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl"
                >
                  Next Application →
                </button>
              ) : (
                <button
                  onClick={() => { if (allCompleted) goNext(); }}
                  disabled={!allCompleted}
                  style={{ zIndex: 10 }}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    allCompleted
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                  }`}
                >
                  Take the Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: TEST
  // ============================================================================
  if (phase === 'test') {
    const q = testQuestions[testQuestion];
    const totalCorrect = calculateTestScore();

    if (testSubmitted) {
      const passed = totalCorrect >= 7;
      return (
        <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />

          <ProgressBar />

          <div className="relative pt-20 pb-12 px-4">
            <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
              <div className="text-7xl mb-4">{passed ? '🎉' : '📚'}</div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <div className={`text-6xl font-bold mb-4 ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                {totalCorrect}/10
              </div>
              <p className="text-slate-400 mb-8">
                {passed ? 'You\'ve mastered Hooke\'s Law!' : 'Review the concepts and try again.'}
              </p>
              <button
                onClick={() => passed ? goNext() : goToPhase('review')}
                style={{ zIndex: 10 }}
                className={`px-8 py-4 rounded-xl font-semibold text-lg ${
                  passed
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                }`}
              >
                {passed ? 'Claim Your Badge!' : 'Review Material'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="max-w-xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">Question {testQuestion + 1} of 10</span>
              <div className="flex gap-1">
                {testQuestions.map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${
                    testAnswers[i] !== null
                      ? testAnswers[i] === testQuestions[i].options.find(o => o.correct)?.id ? 'bg-emerald-500' : 'bg-red-500'
                      : i === testQuestion ? 'bg-emerald-400' : 'bg-slate-700'
                  }`} />
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 mb-4">
              <p className="text-xs text-slate-500 uppercase mb-2">Scenario:</p>
              <p className="text-sm text-slate-300">{q.scenario}</p>
            </div>

            <h2 className="text-lg font-bold text-white mb-6">{q.question}</h2>

            <div className="flex flex-col gap-3 mb-6">
              {q.options.map((opt, i) => {
                const isSelected = testAnswers[testQuestion] === opt.id;
                const isCorrect = opt.correct;
                const showResult = testAnswers[testQuestion] !== null;

                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (testAnswers[testQuestion] === null) {
                        const newAnswers = [...testAnswers];
                        newAnswers[testQuestion] = opt.id;
                        setTestAnswers(newAnswers);
                        playSound(opt.correct ? 'success' : 'failure');
                        emitEvent('test_answered', { questionIndex: testQuestion, correct: opt.correct });
                      }
                    }}
                    style={{ zIndex: 10 }}
                    className={`p-4 rounded-xl text-left transition-all text-sm ${
                      showResult
                        ? isCorrect
                          ? 'bg-emerald-500/20 border-2 border-emerald-500'
                          : isSelected
                            ? 'bg-red-500/20 border-2 border-red-500'
                            : 'bg-slate-800/50 border-2 border-transparent'
                        : isSelected
                          ? 'bg-emerald-500/20 border-2 border-emerald-500'
                          : 'bg-slate-800/50 border-2 border-transparent hover:bg-slate-700/50'
                    }`}
                  >
                    <span className={`font-bold mr-2 ${
                      showResult
                        ? isCorrect ? 'text-emerald-400' : isSelected ? 'text-red-400' : 'text-slate-500'
                        : 'text-emerald-400'
                    }`}>
                      {String.fromCharCode(65 + i)}.
                    </span>
                    <span className="text-white">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {testAnswers[testQuestion] !== null && (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 mb-6">
                <p className="font-semibold text-white mb-1">Explanation</p>
                <p className="text-sm text-slate-400">{q.explanation}</p>
              </div>
            )}

            <div className="flex justify-between">
              {testQuestion > 0 ? (
                <button
                  onClick={() => setTestQuestion(testQuestion - 1)}
                  style={{ zIndex: 10 }}
                  className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Previous
                </button>
              ) : <div />}
              {testAnswers[testQuestion] !== null && (
                testQuestion < testQuestions.length - 1 ? (
                  <button
                    onClick={() => setTestQuestion(testQuestion + 1)}
                    style={{ zIndex: 10 }}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl"
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    onClick={() => setTestSubmitted(true)}
                    style={{ zIndex: 10 }}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl"
                  >
                    See Results
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PHASE: MASTERY
  // ============================================================================
  if (phase === 'mastery') {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />

        <ProgressBar />

        <div className="relative pt-20 pb-12 px-4">
          <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center mb-6">
              <span className="text-6xl">🏆</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Elasticity Master!</h1>
            <p className="text-lg text-slate-400 mb-8 max-w-md">
              You've mastered Hooke's Law, spring constants, and elastic limits. Springs hold no secrets from you!
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { icon: '🔩', label: 'Spring Expert' },
                { icon: '📐', label: 'F = kx Master' },
                { icon: '⚡', label: 'Energy Guru' },
              ].map((achievement, i) => (
                <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <div className="text-xs text-slate-400">{achievement.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 mb-8 max-w-md w-full">
              <p className="text-xs font-bold text-emerald-400 tracking-wider uppercase mb-2">Key Formula Mastered</p>
              <p className="text-2xl font-bold text-white">F = kx</p>
            </div>

            <button
              onClick={() => { goToPhase('hook'); emitEvent('mastery_achieved', {}); }}
              style={{ zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-lg rounded-xl shadow-lg shadow-emerald-500/25"
            >
              Explore Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex items-center justify-center">
      <p className="text-slate-400">Loading...</p>
    </div>
  );
};

export default HookesLawRenderer;
