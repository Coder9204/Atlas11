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

const AngularMomentumRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
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

  // Simulation state
  const [angle, setAngle] = useState(0);
  const [armExtension, setArmExtension] = useState(0.8);
  const [hasWeights, setHasWeights] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);
  const [initialOmega] = useState(2);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const animationRef = useRef<number>();

  // Physics calculations
  const bodyInertia = 2.5;
  const weightMass = hasWeights ? 2 : 0.2;
  const armRadius = 0.3 + armExtension * 0.5;
  const momentOfInertia = bodyInertia + 2 * weightMass * armRadius * armRadius;
  const initialMomentOfInertia = bodyInertia + 2 * weightMass * 0.8 * 0.8;
  const angularMomentum = initialMomentOfInertia * initialOmega;
  const calculatedOmega = angularMomentum / momentOfInertia;

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  // Animation
  useEffect(() => {
    if (isSpinning && (phase === 2 || phase === 5)) {
      const animate = () => {
        setAngle(prev => (prev + calculatedOmega * 0.04) % (2 * Math.PI));
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
      return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
    }
  }, [isSpinning, calculatedOmega, phase]);

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

  const testQuestions = [
    { question: "When a figure skater pulls their arms in during a spin:", options: ["They slow down", "They stay the same speed", "They speed up", "They stop spinning"], correct: 2 },
    { question: "What quantity is conserved when a skater pulls arms in?", options: ["Angular velocity", "Moment of inertia", "Angular momentum", "Kinetic energy"], correct: 2 },
    { question: "If moment of inertia decreases by half, angular velocity:", options: ["Halves", "Stays same", "Doubles", "Quadruples"], correct: 2 },
    { question: "Moment of inertia depends on:", options: ["Mass only", "Radius only", "Both mass and radius squared", "Neither"], correct: 2 },
    { question: "Why do divers tuck into a ball during somersaults?", options: ["Reduce air resistance", "Decrease moment of inertia to spin faster", "Look more aerodynamic", "Feel safer"], correct: 1 },
    { question: "A neutron star spins incredibly fast because:", options: ["Nuclear reactions", "Angular momentum conserved as it collapsed", "Magnetic fields", "Dark matter"], correct: 1 },
    { question: "Why do helicopters need tail rotors?", options: ["For steering", "To counter main rotor's angular momentum", "Extra lift", "Cooling"], correct: 1 },
    { question: "When you extend arms on a spinning chair:", options: ["You speed up", "Nothing happens", "You slow down", "You fly off"], correct: 2 },
    { question: "L = Iω represents:", options: ["Linear momentum", "Angular momentum", "Torque", "Energy"], correct: 1 },
    { question: "Gyroscopes resist tilting because:", options: ["They're heavy", "Angular momentum is conserved", "Friction", "Magnetic forces"], correct: 1 }
  ];

  const calculateScore = () => testAnswers.reduce((score, answer, index) => score + (answer === testQuestions[index].correct ? 1 : 0), 0);

  const applications = [
    { title: "Figure Skating", icon: "⛸️", description: "Skaters pull arms in to spin faster. Starting with arms out, they can increase speed 3-4x.", details: "Olympic skaters reach 300+ RPM. World record is 342 RPM by Natalia Kanounnikova." },
    { title: "Platform Diving", icon: "🏊", description: "Divers tuck tightly to complete multiple somersaults in just 2 seconds from a 10m platform.", details: "Tuck position reduces I by up to 4x compared to pike or layout position." },
    { title: "Gyroscopes", icon: "🔄", description: "Spinning gyroscopes maintain orientation due to angular momentum conservation.", details: "Hubble Space Telescope uses gyroscopes for precise pointing. Your phone has MEMS gyroscopes." },
    { title: "Neutron Stars", icon: "⭐", description: "When massive stars collapse, angular momentum is compressed into tiny volume.", details: "Fastest pulsar spins 716 times per second. Surface moves at 24% speed of light!" }
  ];

  const renderSpinningFigure = () => {
    const personRotation = angle * 180 / Math.PI;
    const armLength = 20 + armExtension * 50;
    const weightSize = hasWeights ? 14 : 5;
    const speedRatio = calculatedOmega / initialOmega;

    return (
      <div className="bg-gradient-to-b from-purple-900/30 to-slate-900/50 rounded-2xl p-6 border border-slate-700/50">
        <svg viewBox="0 0 360 300" className="w-full max-w-[360px] mx-auto block">
          <defs>
            <radialGradient id="spinGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="180" cy="270" rx="140" ry="25" fill="#1E1E28" stroke="#2A2A3A" strokeWidth="1" />
          {isSpinning && <ellipse cx="180" cy="160" rx={70 + armLength} ry={25 + armLength/3} fill="url(#spinGlow)" />}
          <ellipse cx="180" cy="250" rx="28" ry="10" fill="#334155" />
          <rect x="174" y="190" width="12" height="60" fill="#475569" rx="2" />
          <g transform={`translate(180, 155) rotate(${personRotation})`}>
            <ellipse cx="0" cy="20" rx="26" ry="38" fill="#475569" stroke="#64748B" strokeWidth="2" />
            <circle cx="0" cy="-28" r="22" fill="#64748B" stroke="#94A3B8" strokeWidth="2" />
            <circle cx="-7" cy="-32" r="4" fill="#1E293B" />
            <circle cx="7" cy="-32" r="4" fill="#1E293B" />
            <line x1="-22" y1="2" x2={-22 - armLength} y2="2" stroke="#94A3B8" strokeWidth="10" strokeLinecap="round" />
            <circle cx={-22 - armLength} cy="2" r={weightSize} fill={hasWeights ? '#EC4899' : '#64748B'} stroke={hasWeights ? '#F472B6' : '#475569'} strokeWidth="2" />
            <line x1="22" y1="2" x2={22 + armLength} y2="2" stroke="#94A3B8" strokeWidth="10" strokeLinecap="round" />
            <circle cx={22 + armLength} cy="2" r={weightSize} fill={hasWeights ? '#EC4899' : '#64748B'} stroke={hasWeights ? '#F472B6' : '#475569'} strokeWidth="2" />
          </g>
        </svg>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-400 mb-1">SPIN SPEED</div>
            <div className="text-lg font-bold text-white">{calculatedOmega.toFixed(1)} rad/s</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-400 mb-1">MOMENT I</div>
            <div className="text-lg font-bold text-amber-400">{momentOfInertia.toFixed(2)} kg·m²</div>
          </div>
          <div className={`rounded-lg p-3 text-center ${speedRatio > 1.2 ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-slate-800/50'}`}>
            <div className="text-xs text-slate-400 mb-1">SPEED GAIN</div>
            <div className={`text-lg font-bold ${speedRatio > 1.2 ? 'text-emerald-400' : 'text-white'}`}>{speedRatio.toFixed(1)}×</div>
          </div>
        </div>
        <div className="mt-4 p-4 bg-purple-500/10 rounded-xl border border-purple-500/30 text-center">
          <span className="text-xs text-purple-400 font-medium">ANGULAR MOMENTUM (CONSERVED)</span>
          <div className="text-xl font-bold text-purple-400 mt-1">L = {angularMomentum.toFixed(2)} kg·m²/s ✓</div>
        </div>
      </div>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-purple-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-purple-100 to-pink-200 bg-clip-text text-transparent">
        The Spinning Secret
      </h1>
      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover why figure skaters spin faster when they pull their arms in
      </p>
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 rounded-3xl" />
        <div className="relative">
          <div className="text-6xl mb-6">⛸️</div>
          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              A skater starts spinning slowly with arms outstretched.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              They pull their arms in close to their body and suddenly spin much faster!
            </p>
            <div className="pt-2">
              <p className="text-base text-purple-400 font-semibold">
                How do they speed up without pushing off anything?
              </p>
            </div>
          </div>
        </div>
      </div>
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover the Physics
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2"><span className="text-purple-400">✦</span>Interactive Lab</div>
        <div className="flex items-center gap-2"><span className="text-purple-400">✦</span>Real-World Examples</div>
        <div className="flex items-center gap-2"><span className="text-purple-400">✦</span>Knowledge Test</div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          WHY does pulling arms in make a skater spin faster?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Arms push air outward, reaction pushes skater faster' },
          { id: 'B', text: 'Angular momentum conserved—smaller radius needs faster speed' },
          { id: 'C', text: 'Muscles add energy when pulling arms in' },
          { id: 'D', text: 'Gravity affects you less with arms closer to body' }
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
            ✓ Correct! Angular momentum L = Iω is conserved. When I decreases, ω must increase!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
          >
            Try the Experiment →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Spinning Chair Lab</h2>
      {renderSpinningFigure()}
      <div className="w-full max-w-md mt-6 space-y-4">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Arm Position: {armExtension < 0.3 ? 'Tucked' : armExtension > 0.7 ? 'Extended' : 'Mid'}</label>
          <input type="range" min="0" max="1" step="0.1" value={armExtension} onChange={(e) => setArmExtension(parseFloat(e.target.value))} className="w-full accent-purple-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onMouseDown={(e) => { e.preventDefault(); setHasWeights(true); }}
            className={`p-4 rounded-xl font-medium transition-all ${hasWeights ? 'bg-pink-500/30 border-2 border-pink-500' : 'bg-slate-700/50 border-2 border-transparent'} text-white`}
          >
            🏋️ With Weights
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); setHasWeights(false); }}
            className={`p-4 rounded-xl font-medium transition-all ${!hasWeights ? 'bg-purple-500/30 border-2 border-purple-500' : 'bg-slate-700/50 border-2 border-transparent'} text-white`}
          >
            🙌 Arms Only
          </button>
        </div>
        <button
          onMouseDown={(e) => { e.preventDefault(); setIsSpinning(!isSpinning); setExperimentCount(c => c + 1); }}
          className={`w-full py-4 rounded-xl font-semibold text-white ${isSpinning ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
        >
          {isSpinning ? '⏹ Stop Spinning' : '▶ Start Spinning'}
        </button>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl">
        Review the Physics →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Conservation of Angular Momentum</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-3">🔄 Angular Momentum (L)</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• L = I × ω (moment of inertia × angular velocity)</li>
            <li>• CONSERVED when no external torque acts</li>
            <li>• Like a "spinning memory" that must be preserved</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">⚖️ Moment of Inertia (I)</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• I = Σmr² (mass × distance² from axis)</li>
            <li>• Farther mass = larger I</li>
            <li>• Extended arms = large I, tucked = small I</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">🎯 The Conservation Law</h3>
          <p className="text-slate-300 text-sm">
            <strong>L = Iω = constant</strong> — When you pull arms in, I decreases. Since L must stay constant, ω must INCREASE!<br/>
            If I drops by half, ω doubles. That's how skaters spin 3-4× faster!
          </p>
        </div>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }} className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Try a Challenge →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">🌟 The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          You've seen heavy weights make a big difference. What if you spin with NO weights (just your arms)?
        </p>
        <p className="text-lg text-purple-400 font-medium">
          Will the speed increase be bigger, smaller, or the same?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Same speed increase (arms have mass too)' },
          { id: 'B', text: 'SMALLER speed increase (less mass being moved)' },
          { id: 'C', text: 'LARGER speed increase (weights were slowing you)' },
          { id: 'D', text: 'No change at all (weights don\'t matter)' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400'
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
            ✓ Correct! Less mass means smaller change in I, so smaller change in ω!
          </p>
          <button onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }} className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
            Compare Both →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Compare With/Without Weights</h2>
      <div className="grid grid-cols-2 gap-3 w-full max-w-md mb-4">
        <button
          onMouseDown={(e) => { e.preventDefault(); setHasWeights(true); }}
          className={`p-4 rounded-xl font-medium transition-all ${hasWeights ? 'bg-pink-500/30 border-2 border-pink-500' : 'bg-slate-700/50 border-2 border-transparent'} text-white`}
        >
          🏋️ Heavy Weights
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); setHasWeights(false); }}
          className={`p-4 rounded-xl font-medium transition-all ${!hasWeights ? 'bg-purple-500/30 border-2 border-purple-500' : 'bg-slate-700/50 border-2 border-transparent'} text-white`}
        >
          🙌 Arms Only
        </button>
      </div>
      {renderSpinningFigure()}
      <div className="bg-slate-700/50 rounded-xl p-4 w-full max-w-md mt-4">
        <label className="text-slate-300 text-sm block mb-2">Arm Position</label>
        <input type="range" min="0" max="1" step="0.1" value={armExtension} onChange={(e) => setArmExtension(parseFloat(e.target.value))} className="w-full accent-amber-500" />
      </div>
      <button
        onMouseDown={(e) => { e.preventDefault(); setIsSpinning(!isSpinning); }}
        className={`w-full max-w-md mt-4 py-4 rounded-xl font-semibold text-white ${isSpinning ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
      >
        {isSpinning ? '⏹ Stop' : '▶ Spin'}
      </button>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        See Why →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">🌟 Mass Distribution is Key!</h2>
      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-slate-300 mb-4">Since <strong className="text-purple-400">I = Σmr²</strong>, the mass (m) multiplies the effect of changing position (r):</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 p-4 rounded-xl text-center">
            <div className="text-3xl mb-2">🏋️</div>
            <div className="text-pink-400 font-bold">Heavy weights</div>
            <div className="text-slate-400 text-sm">Large ΔI → Large Δω</div>
            <div className="text-emerald-400 mt-2">Spin 3× faster!</div>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl text-center">
            <div className="text-3xl mb-2">🙌</div>
            <div className="text-purple-400 font-bold">Arms only</div>
            <div className="text-slate-400 text-sm">Small ΔI → Small Δω</div>
            <div className="text-amber-400 mt-2">Spin 1.2× faster</div>
          </div>
        </div>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl">
        Real-World Applications →
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
              activeAppTab === index ? 'bg-purple-600 text-white'
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
        <p className="text-lg text-slate-300 mb-3">{applications[activeAppTab].description}</p>
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
        <button onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl">
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
                    className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-purple-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
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
            className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(-1) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'}`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/10</h3>
          <p className="text-slate-300 mb-6">{calculateScore() >= 7 ? 'Excellent! You\'ve mastered angular momentum!' : 'Keep studying! Review and try again.'}</p>
          {calculateScore() >= 7 ? (
            <button onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }} className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl">
              Claim Your Mastery Badge →
            </button>
          ) : (
            <button onMouseDown={(e) => { e.preventDefault(); setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase(3); }} className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl">
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-purple-900/50 via-pink-900/50 to-amber-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">⛸️</div>
        <h1 className="text-3xl font-bold text-white mb-4">Angular Momentum Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You've mastered the conservation of angular momentum!</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🔄</div><p className="text-sm text-slate-300">L = Iω</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">⚖️</div><p className="text-sm text-slate-300">I = Σmr²</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">⛸️</div><p className="text-sm text-slate-300">Figure Skating</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">⭐</div><p className="text-sm text-slate-300">Neutron Stars</p></div>
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Angular Momentum</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-purple-400 w-6 shadow-lg shadow-purple-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-purple-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default AngularMomentumRenderer;
