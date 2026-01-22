'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

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

const TippingPointRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
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

  // Tipping simulation state
  const [tiltAngle, setTiltAngle] = useState(0);
  const [objectType, setObjectType] = useState<'tall' | 'wide' | 'normal'>('normal');
  const [hasTipped, setHasTipped] = useState(false);
  const [tippingAngles, setTippingAngles] = useState<Record<string, number>>({});

  // Twist: loading position
  const [loadPosition, setLoadPosition] = useState<'low' | 'middle' | 'high'>('middle');
  const [twistTiltAngle, setTwistTiltAngle] = useState(0);
  const [twistHasTipped, setTwistHasTipped] = useState(false);
  const [twistExperimentsRun, setTwistExperimentsRun] = useState(0);

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
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete, onGameEvent]);

  // Tipping physics
  const getCriticalAngle = (type: 'tall' | 'wide' | 'normal', load: 'low' | 'middle' | 'high' = 'middle') => {
    const baseAngles = { tall: 15, normal: 30, wide: 50 };
    let angle = baseAngles[type];
    if (load === 'high') angle *= 0.6;
    if (load === 'low') angle *= 1.3;
    return angle;
  };

  const handleTilt = useCallback((delta: number, istwist = false) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;

    if (istwist) {
      if (twistHasTipped) return;
      const newAngle = Math.max(0, Math.min(60, twistTiltAngle + delta));
      setTwistTiltAngle(newAngle);
      const criticalAngle = getCriticalAngle('normal', loadPosition);
      if (newAngle >= criticalAngle) {
        setTwistHasTipped(true);
        playSound('failure');
      }
    } else {
      if (hasTipped) return;
      const newAngle = Math.max(0, Math.min(60, tiltAngle + delta));
      setTiltAngle(newAngle);
      const criticalAngle = getCriticalAngle(objectType);
      if (newAngle >= criticalAngle) {
        setHasTipped(true);
        setTippingAngles(prev => ({ ...prev, [objectType]: newAngle }));
        playSound('failure');
      }
    }
  }, [twistHasTipped, twistTiltAngle, loadPosition, hasTipped, tiltAngle, objectType, playSound]);

  const resetTilt = useCallback((istwist = false) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;

    if (istwist) {
      setTwistTiltAngle(0);
      setTwistHasTipped(false);
    } else {
      setTiltAngle(0);
      setHasTipped(false);
    }
  }, []);

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
    playSound(prediction === 'both' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'high_unstable' ? 'success' : 'failure');
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
    { question: "An object tips when:", options: ["Its weight increases", "The CG moves outside the base of support", "It gets too tall", "Wind blows"], correct: 1 },
    { question: "A wider base makes an object:", options: ["Heavier", "More stable", "Taller", "Lighter"], correct: 1 },
    { question: "A lower center of gravity makes an object:", options: ["Less stable", "More stable", "Unchanged", "Fall faster"], correct: 1 },
    { question: "Loading cargo HIGH in a truck makes it:", options: ["More stable", "Less stable", "Faster", "Slower"], correct: 1 },
    { question: "Weeble toys don't fall down because:", options: ["They're magnetic", "Heavy weighted bottom keeps CG low", "They're made of rubber", "Air pressure"], correct: 1 },
    { question: "A tall narrow bookshelf tips easily because:", options: ["It's too heavy", "Its CG is high and base is narrow", "The shelves are weak", "It's old"], correct: 1 },
    { question: "SUVs have higher rollover risk than sports cars due to:", options: ["More power", "Higher center of gravity", "Heavier weight", "Bigger tires"], correct: 1 },
    { question: "Pyramids are extremely stable because:", options: ["They're made of stone", "Wide base with low CG", "They're ancient", "Desert sand"], correct: 1 },
    { question: "A gymnast in a handstand is unstable because:", options: ["Arms are weak", "High CG over tiny base (hands)", "Blood rush", "Floor is slippery"], correct: 1 },
    { question: "Double-decker buses stay stable by:", options: ["Wide wheels", "Heavy engine/chassis at bottom", "Passengers sit evenly", "Slow speed"], correct: 1 }
  ];

  const calculateScore = () => testAnswers.reduce((score, answer, index) => score + (answer === testQuestions[index].correct ? 1 : 0), 0);

  const renderTippingVisualization = (
    angle: number,
    type: 'tall' | 'wide' | 'normal',
    tipped: boolean,
    loadPos?: 'low' | 'middle' | 'high'
  ) => {
    const objectDims = {
      tall: { width: 40, height: 120 },
      normal: { width: 60, height: 80 },
      wide: { width: 100, height: 50 }
    };
    const dims = objectDims[type];
    const criticalAngle = getCriticalAngle(type, loadPos);
    let cgY = dims.height / 2;
    if (loadPos === 'high') cgY = dims.height * 0.75;
    if (loadPos === 'low') cgY = dims.height * 0.25;
    const pivotX = 140;
    const pivotY = 180;

    return (
      <svg viewBox="0 0 280 220" className="w-full h-48 md:h-56">
        <defs>
          <linearGradient id="objectGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={tipped ? '#ef4444' : '#10B981'} stopOpacity="0.8" />
            <stop offset="100%" stopColor={tipped ? '#B91C1C' : '#059669'} stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect x="0" y="195" width="280" height="25" fill="#475569" />
        <g transform={`rotate(${angle}, ${pivotX}, ${pivotY})`}>
          <rect x={pivotX - 70} y={pivotY - 5} width="140" height="10" fill="#94a3b8" rx="3" />
          <g transform={`translate(${pivotX}, ${pivotY - 5})`}>
            <rect x={-dims.width / 2} y={-dims.height} width={dims.width} height={dims.height} fill="url(#objectGrad)" rx="5"
              style={{ transform: tipped ? 'rotate(30deg)' : 'rotate(0deg)', transformOrigin: '0 0', transition: 'transform 0.3s' }} />
            <circle cx="0" cy={-cgY} r="8" fill="#3B82F6" stroke="white" strokeWidth="2" />
            <text x="0" y={-cgY + 3} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">CG</text>
            {loadPos && (
              <rect x={-dims.width / 4} y={loadPos === 'high' ? -dims.height + 10 : loadPos === 'low' ? -30 : -dims.height / 2 - 10}
                width={dims.width / 2} height="20" fill="#F59E0B" rx="3" />
            )}
          </g>
          <line x1={pivotX - dims.width / 2} y1={pivotY + 15} x2={pivotX + dims.width / 2} y2={pivotY + 15} stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
        </g>
        <text x="20" y="25" fill="#94a3b8" fontSize="11" fontWeight="bold">Tilt: {angle.toFixed(0)}°</text>
        <text x="20" y="42" fill={angle >= criticalAngle ? '#ef4444' : '#10B981'} fontSize="10">Critical: {criticalAngle.toFixed(0)}°</text>
        <g transform="translate(140, 18)">
          <rect x="-35" y="-12" width="70" height="22" fill={tipped ? '#ef4444' : '#10B981'} rx="11" />
          <text x="0" y="4" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">{tipped ? 'TIPPED!' : 'STABLE'}</text>
        </g>
      </svg>
    );
  };

  const applications = [
    {
      title: "Vehicle Rollover Safety",
      icon: "🚗",
      description: "Vehicles with high centers of gravity (SUVs, trucks) have a higher rollover risk than low-slung sports cars.",
      details: "Electronic Stability Control (ESC) monitors steering and yaw rate. When it detects potential rollover conditions, it applies individual brakes and reduces power."
    },
    {
      title: "Building Foundations",
      icon: "🏗️",
      description: "Tall buildings are designed with massive foundations that extend the base of support and lower the overall center of gravity.",
      details: "Foundations spread building weight over large areas and often extend deep underground to prevent tipping."
    },
    {
      title: "Baby Product Safety",
      icon: "👶",
      description: "Baby walkers, high chairs, and furniture are designed with low CGs and wide bases to prevent tipping.",
      details: "Weeble toys work on this principle - weighted bottoms keep the CG so low that they always self-right."
    },
    {
      title: "Ship Stability",
      icon: "🚢",
      description: "Ships use ballast, cargo placement, and hull design to maintain stability in rough seas.",
      details: "Ballast tanks filled with water lower the CG. Cargo is carefully distributed to maintain proper balance."
    }
  ];

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-emerald-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-emerald-100 to-teal-200 bg-clip-text text-transparent">
        The Tipping Point
      </h1>
      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover why some objects topple easily while others stand firm
      </p>
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 rounded-3xl" />
        <div className="relative">
          <svg viewBox="0 0 300 180" className="w-full h-44 mb-4">
            <rect x="0" y="160" width="300" height="20" fill="#475569" />
            <g transform="translate(80, 160)">
              <rect x="-15" y="-100" width="30" height="100" fill="#ef4444" rx="3" />
              <text x="0" y="-105" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold">TALL</text>
            </g>
            <g transform="translate(220, 160)">
              <rect x="-50" y="-40" width="100" height="40" fill="#10B981" rx="3" />
              <text x="0" y="-45" textAnchor="middle" fill="#10B981" fontSize="10" fontWeight="bold">WIDE</text>
            </g>
            <text x="150" y="100" textAnchor="middle" fill="#f59e0b" fontSize="20" fontWeight="bold">VS</text>
          </svg>
          <div className="mt-6 space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              A bookshelf falls over, but a coffee table stays put.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              What determines when something tips?
            </p>
            <div className="pt-2">
              <p className="text-base text-emerald-400 font-semibold">
                Explore the physics of stability!
              </p>
            </div>
          </div>
        </div>
      </div>
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover the Secret
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2"><span className="text-emerald-400">✦</span>Interactive Lab</div>
        <div className="flex items-center gap-2"><span className="text-emerald-400">✦</span>Real-World Examples</div>
        <div className="flex items-center gap-2"><span className="text-emerald-400">✦</span>Knowledge Test</div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          What makes objects stable against tipping? Choose the best answer:
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'weight', text: 'Heavier objects are always more stable' },
          { id: 'base', text: 'Wider base = more stability' },
          { id: 'height', text: 'Shorter objects = more stability' },
          { id: 'both', text: 'Both base width AND height matter (CG position)' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'both' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'both' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="text-slate-200">{option.text}</span>
          </button>
        ))}
      </div>
      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! The center of gravity (CG) must stay OVER the base of support to remain stable!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Stability Lab</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderTippingVisualization(tiltAngle, objectType, hasTipped)}
      </div>
      <div className="mb-4 w-full max-w-2xl">
        <h4 className="text-slate-300 text-sm mb-2 font-semibold">Select Object Shape:</h4>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'tall' as const, label: 'Tall & Narrow' },
            { id: 'normal' as const, label: 'Normal' },
            { id: 'wide' as const, label: 'Wide & Short' }
          ].map(obj => (
            <button
              key={obj.id}
              onMouseDown={(e) => { e.preventDefault(); setObjectType(obj.id); resetTilt(); }}
              className={`p-3 rounded-lg transition-all ${objectType === obj.id ? 'bg-emerald-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
            >
              <p className="text-sm font-medium">{obj.label}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 mb-4">
        <button onMouseDown={(e) => { e.preventDefault(); handleTilt(-5); }} disabled={hasTipped || tiltAngle <= 0}
          className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-2xl text-white disabled:opacity-50">-</button>
        <div className="text-center">
          <p className="text-lg font-bold text-emerald-400">{tiltAngle.toFixed(0)}°</p>
          <p className="text-sm text-slate-400">Tilt angle</p>
        </div>
        <button onMouseDown={(e) => { e.preventDefault(); handleTilt(5); }} disabled={hasTipped}
          className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-2xl text-white disabled:opacity-50">+</button>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); resetTilt(); }} className="px-6 py-2 rounded-lg bg-slate-700 text-white font-medium mb-4">Reset</button>
      {Object.keys(tippingAngles).length > 0 && (
        <div className="bg-emerald-900/30 rounded-xl p-4 mb-4 max-w-2xl w-full">
          <h4 className="font-semibold text-emerald-400 mb-2">Results:</h4>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(tippingAngles).map(([type, angle]) => (
              <div key={type} className="bg-slate-800/50 rounded-lg p-2 text-center">
                <p className="text-sm font-medium text-slate-300 capitalize">{type}</p>
                <p className="text-lg font-bold text-emerald-400">{angle.toFixed(0)}°</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }} disabled={Object.keys(tippingAngles).length < 2}
        className="mt-4 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl disabled:opacity-50">
        Review the Concepts
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">The Stability Secret</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">More Stable When:</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Wider base of support</li>
            <li>• Lower center of gravity</li>
            <li>• Heavier bottom, lighter top</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-red-400 mb-3">Less Stable When:</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Narrow base of support</li>
            <li>• High center of gravity</li>
            <li>• Top-heavy loading</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">The Physics Rule</h3>
          <p className="text-slate-300 text-sm">
            An object tips when the <span className="text-emerald-400">Center of Gravity</span> moves
            OUTSIDE the <span className="text-cyan-400">Base of Support</span>. Gravity pulls straight
            down on the CG - as long as this line hits inside the base, the object is stable!
          </p>
        </div>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }} className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Discover the Loading Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Loading Twist</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Imagine loading cargo in a delivery truck. Does it matter if heavy boxes go on top or bottom?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'no_difference', text: "Load position doesn't affect stability" },
          { id: 'high_unstable', text: 'High load makes it tip easier' },
          { id: 'low_unstable', text: 'Low load makes it tip easier' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'high_unstable' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'high_unstable' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="text-slate-200">{option.text}</span>
          </button>
        ))}
      </div>
      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! Higher loads raise the center of gravity, making objects tip more easily!
          </p>
          <button onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }} className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
            Test Loading Positions
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Loading Position Lab</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderTippingVisualization(twistTiltAngle, 'normal', twistHasTipped, loadPosition)}
      </div>
      <div className="mb-4 w-full max-w-2xl">
        <h4 className="text-slate-300 text-sm mb-2 font-semibold">Load Position:</h4>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'low' as const, label: 'Low', desc: 'Bottom loaded' },
            { id: 'middle' as const, label: 'Middle', desc: 'Center loaded' },
            { id: 'high' as const, label: 'High', desc: 'Top loaded' }
          ].map(pos => (
            <button
              key={pos.id}
              onMouseDown={(e) => { e.preventDefault(); setLoadPosition(pos.id); resetTilt(true); }}
              className={`p-3 rounded-lg transition-all ${loadPosition === pos.id ? 'bg-amber-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
            >
              <p className="font-medium text-sm">{pos.label}</p>
              <p className="text-xs opacity-80">{pos.desc}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 mb-4">
        <button onMouseDown={(e) => { e.preventDefault(); handleTilt(-5, true); }} disabled={twistHasTipped || twistTiltAngle <= 0}
          className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-2xl text-white disabled:opacity-50">-</button>
        <div className="text-center">
          <p className="text-lg font-bold text-amber-400">{twistTiltAngle.toFixed(0)}°</p>
          <p className="text-sm text-slate-400">Tilt angle</p>
        </div>
        <button onMouseDown={(e) => { e.preventDefault(); handleTilt(5, true); }} disabled={twistHasTipped}
          className="w-12 h-12 rounded-full bg-amber-600 flex items-center justify-center text-2xl text-white disabled:opacity-50">+</button>
      </div>
      <div className="flex gap-3 mb-4">
        <button onMouseDown={(e) => { e.preventDefault(); resetTilt(true); }} className="px-6 py-2 rounded-lg bg-slate-700 text-white font-medium">Reset</button>
        {twistHasTipped && (
          <button onMouseDown={(e) => { e.preventDefault(); setTwistExperimentsRun(prev => prev + 1); resetTilt(true); }}
            className="px-6 py-2 rounded-lg bg-amber-600 text-white font-medium">Try Another</button>
        )}
      </div>
      {twistHasTipped && (
        <div className="bg-amber-900/30 rounded-xl p-4 mb-4 max-w-2xl">
          <p className="text-amber-300">
            <span className="font-bold">
              {loadPosition === 'high' && 'High load tipped early!'}
              {loadPosition === 'middle' && 'Middle load tipped at moderate angle'}
              {loadPosition === 'low' && 'Low load lasted longest!'}
            </span>
          </p>
        </div>
      )}
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }} disabled={twistExperimentsRun < 2}
        className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl disabled:opacity-50">
        Review Findings
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Loading Effects</h2>
      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-amber-400 mb-4">The Complete Picture</h3>
        <p className="text-slate-300 mb-4">
          Heavy items placed HIGH raise the center of gravity, making objects tip at smaller angles.
          Always load heavy items LOW for maximum stability!
        </p>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• <span className="font-semibold">Trucks:</span> Heavy cargo at bottom</li>
          <li>• <span className="font-semibold">SUVs:</span> Higher CG = more rollover risk</li>
          <li>• <span className="font-semibold">Shipping:</span> Heavy items in lower holds</li>
          <li>• <span className="font-semibold">Backpacks:</span> Heavy items close to back</li>
        </ul>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl">
        Explore Real-World Applications
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
              activeAppTab === index ? 'bg-emerald-600 text-white'
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
        <p className="text-lg text-slate-300 mt-4 mb-3">{applications[activeAppTab].description}</p>
        <p className="text-sm text-slate-400">{applications[activeAppTab].details}</p>
        {!completedApps.has(activeAppTab) && (
          <button onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }} className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium">
            Mark as Understood
          </button>
        )}
      </div>
      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">{applications.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />))}</div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>
      {completedApps.size >= 4 && (
        <button onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl">
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
              <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-emerald-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
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
            className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(-1) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'}`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/10</h3>
          <p className="text-slate-300 mb-6">{calculateScore() >= 7 ? "Excellent! You've mastered stability physics!" : 'Keep studying! Review and try again.'}</p>
          {calculateScore() >= 7 ? (
            <button onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }} className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl">
              Claim Your Mastery Badge
            </button>
          ) : (
            <button onMouseDown={(e) => { e.preventDefault(); setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase(3); }} className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl">
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-emerald-900/50 via-teal-900/50 to-cyan-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">⚖️</div>
        <h1 className="text-3xl font-bold text-white mb-4">Stability Physics Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You've mastered the physics of balance and tipping!</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">📐</div><p className="text-sm text-slate-300">Center of Gravity</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🏗️</div><p className="text-sm text-slate-300">Base of Support</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">📦</div><p className="text-sm text-slate-300">Load Position</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🚗</div><p className="text-sm text-slate-300">Vehicle Safety</p></div>
        </div>
        <button onMouseDown={(e) => { e.preventDefault(); goToPhase(0); }} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl">Explore Again</button>
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Tipping Point</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-emerald-400 w-6 shadow-lg shadow-emerald-400/30'
                    : phase > p
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

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default TippingPointRenderer;
