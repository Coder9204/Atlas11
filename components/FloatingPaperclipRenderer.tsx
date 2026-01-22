'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────
// FloatingPaperclipRenderer – Teach surface tension support
// ─────────────────────────────────────────────────────────────
// Physics: Surface tension creates a "skin" supporting heavy objects
// Steel paperclip floats despite being 8× denser than water
// Force balance: Weight = Surface tension × perimeter × sin(θ)

interface GameEvent {
  type: 'phase_change' | 'prediction' | 'result' | 'complete';
  from?: string;
  to?: string;
  phase?: string;
  prediction?: string;
  actual?: string;
  correct?: boolean;
  score?: number;
  total?: number;
  percentage?: number;
}

interface FloatingPaperclipRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  onPhaseComplete?: (phase: number) => void;
}

type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

const phaseOrder: Phase[] = [
  'hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery',
];

const phaseLabels: Record<Phase, string> = {
  hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review',
  twist_predict: 'Twist', twist_play: 'Twist Lab', twist_review: 'Twist Review',
  transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function FloatingPaperclipRenderer({ onGameEvent, onPhaseComplete }: FloatingPaperclipRendererProps) {
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [testAnswers, setTestAnswers] = useState<Record<number, number>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [clipState, setClipState] = useState<'hovering' | 'floating' | 'sinking'>('hovering');
  const [clipY, setClipY] = useState(30);
  const [dropMethod, setDropMethod] = useState<'gentle' | 'dropped'>('gentle');
  const [dimpleDepth, setDimpleDepth] = useState(0);
  const [hasDropped, setHasDropped] = useState(false);

  // Twist state - add soap
  const [soapAdded, setSoapAdded] = useState(false);
  const [twistClipY, setTwistClipY] = useState(60);
  const [twistClipState, setTwistClipState] = useState<'floating' | 'sinking' | 'sunk'>('floating');

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

  const goToPhase = useCallback((newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setTimeout(() => { navigationLockRef.current = false; }, 400);

    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', from: phase, to: newPhase });
    }
    setPhase(newPhase);
    onPhaseComplete?.(phaseOrder.indexOf(newPhase));
    playSound('transition');
  }, [onGameEvent, phase, onPhaseComplete, playSound]);

  // Drop the paperclip
  const dropClip = () => {
    if (hasDropped) return;
    setHasDropped(true);
    setClipState('floating');

    if (dropMethod === 'gentle') {
      let y = clipY;
      let dimple = 0;

      const interval = setInterval(() => {
        if (y < 95) {
          y += 2;
          setClipY(y);
        } else {
          dimple = Math.min(dimple + 0.5, 8);
          setDimpleDepth(dimple);
          if (dimple >= 8) {
            clearInterval(interval);
            playSound('success');
          }
        }
      }, 30);
    } else {
      setClipState('sinking');
      let y = clipY;

      const interval = setInterval(() => {
        y += 4;
        setClipY(Math.min(y, 180));
        if (y >= 180) {
          clearInterval(interval);
          playSound('failure');
        }
      }, 30);
    }
  };

  const resetSimulation = () => {
    setClipState('hovering');
    setClipY(30);
    setDimpleDepth(0);
    setHasDropped(false);
  };

  // Twist - add soap to floating clip
  const addSoapToWater = () => {
    if (soapAdded || twistClipState !== 'floating') return;
    setSoapAdded(true);
    setTwistClipState('sinking');

    playSound('click');

    let y = twistClipY;
    const interval = setInterval(() => {
      y += 3;
      setTwistClipY(Math.min(y, 180));
      if (y >= 180) {
        clearInterval(interval);
        setTwistClipState('sunk');
        playSound('failure');
      }
    }, 40);
  };

  const resetTwist = () => {
    setSoapAdded(false);
    setTwistClipY(60);
    setTwistClipState('floating');
  };

  const handlePrediction = (choice: string) => {
    setPrediction(choice);
    if (onGameEvent) {
      onGameEvent({ type: 'prediction', phase: 'predict', prediction: choice });
    }
    playSound('click');
  };

  const handleTwistPrediction = (choice: string) => {
    setTwistPrediction(choice);
    if (onGameEvent) {
      onGameEvent({ type: 'prediction', phase: 'twist_predict', prediction: choice });
    }
    playSound('click');
  };

  const handleTestAnswer = (q: number, a: number) => {
    if (!testSubmitted) {
      setTestAnswers(prev => ({ ...prev, [q]: a }));
      playSound('click');
    }
  };

  const submitTest = () => {
    setTestSubmitted(true);
    const score = testQuestions.reduce((acc, tq, i) => acc + (testAnswers[i] === tq.correct ? 1 : 0), 0);
    if (onGameEvent) {
      onGameEvent({
        type: 'result',
        phase: 'test',
        score,
        total: testQuestions.length,
        percentage: Math.round((score / testQuestions.length) * 100),
      });
    }
    playSound(score >= 7 ? 'success' : 'failure');
  };

  const testQuestions = [
    { q: "Why does a steel paperclip float on water?", options: ["Steel is less dense than water", "Surface tension supports it", "Air bubbles hold it up", "The paperclip is hollow"], correct: 1 },
    { q: "What visible feature shows surface tension supporting the paperclip?", options: ["Bubbles around the clip", "Color change in water", "A dimple in the water surface", "Ripples spreading outward"], correct: 2 },
    { q: "Why does a dropped paperclip sink but a gently placed one floats?", options: ["Dropped clip is heavier", "Gentle placement allows surface tension to form gradually", "Water temperature changes", "Air pressure pushes it down"], correct: 1 },
    { q: "What happens when you add soap to water with a floating paperclip?", options: ["The clip floats higher", "Nothing changes", "The clip immediately sinks", "The water turns cloudy"], correct: 2 },
    { q: "Which formula relates surface tension force to contact angle?", options: ["F = mg", "F = γ × L × sin(θ)", "F = ρgh", "F = ma"], correct: 1 },
    { q: "Why can water striders walk on water?", options: ["They are very light", "Their legs have oils and hairs that don't break surface tension", "They move too fast to sink", "Water pushes them up"], correct: 1 },
    { q: "What is the approximate density ratio of steel to water?", options: ["1:1 (same density)", "2:1", "5:1", "8:1"], correct: 3 },
    { q: "What determines the maximum weight surface tension can support?", options: ["Water depth", "Contact perimeter and contact angle", "Water color", "Container shape"], correct: 1 },
    { q: "Why does a needle float better when placed parallel to the water surface?", options: ["It's lighter that way", "More contact length means more surface tension force", "The needle is magnetic", "Air gets trapped underneath"], correct: 1 },
    { q: "What natural phenomenon uses surface tension for survival?", options: ["Birds flying", "Fish swimming", "Insects walking on water", "Plants absorbing sunlight"], correct: 2 }
  ];

  const applications = [
    { title: "Water Striders", description: "Insects that walk on water", icon: "🦟" },
    { title: "Floating Needle Compass", description: "Ancient navigation technique", icon: "🧭" },
    { title: "Mosquito Eggs", description: "Rafts of floating eggs", icon: "🥚" },
    { title: "Microfluidics", description: "Lab-on-a-chip technology", icon: "🔬" }
  ];

  const renderPhase = () => {
    switch (phase) {
      case 'hook':
        return (
          <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-8">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-blue-400 tracking-wide">SURFACE PHYSICS</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">
              Steel That Floats?
            </h1>

            <p className="text-lg text-slate-400 max-w-md mb-10">
              Steel is 8 times denser than water. It should sink immediately... right?
            </p>

            <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 rounded-3xl" />

              <div className="relative">
                <svg viewBox="0 0 400 250" className="w-full h-56 mb-4">
                  <rect x="50" y="100" width="300" height="130" fill="#1e40af" rx="5" />
                  <rect x="55" y="105" width="290" height="120" fill="#3b82f6" rx="3" />
                  <ellipse cx="200" cy="105" rx="140" ry="5" fill="#60a5fa" opacity="0.5" />

                  <g transform="translate(170, 95)">
                    <ellipse cx="30" cy="12" rx="35" ry="6" fill="#1d4ed8" opacity="0.5" />
                    <path
                      d="M 5,5 L 5,15 Q 5,20 10,20 L 50,20 Q 55,20 55,15 L 55,5 Q 55,0 50,0 L 15,0 Q 10,0 10,5 L 10,12"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path d="M 8,3 L 12,3" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
                  </g>

                  <text x="120" y="80" fill="#fbbf24" fontSize="24" fontWeight="bold">?</text>
                  <text x="280" y="80" fill="#fbbf24" fontSize="24" fontWeight="bold">?</text>

                  <text x="200" y="45" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
                    A steel paperclip floating on water!
                  </text>

                  <g transform="translate(70, 175)">
                    <rect x="0" y="0" width="60" height="20" fill="#64748b" rx="3" />
                    <text x="30" y="14" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">Steel: 7850</text>
                  </g>
                  <g transform="translate(270, 175)">
                    <rect x="0" y="0" width="60" height="20" fill="#3b82f6" rx="3" />
                    <text x="30" y="14" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">Water: 1000</text>
                  </g>
                  <text x="200" y="208" textAnchor="middle" fill="#94a3b8" fontSize="10">kg/m³</text>
                </svg>
              </div>
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase('predict'); }}
              className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center gap-3">
                Discover the Secret
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
          </div>
        );

      case 'predict':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
            <p className="text-slate-400 mb-6 text-center max-w-md">
              You have a paperclip and a bowl of water. What do you think will happen
              when you <span className="text-blue-400 font-semibold">gently place</span> the paperclip on the water?
            </p>

            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'a', text: 'Sinks immediately (steel is too dense)' },
                { id: 'b', text: 'Floats on the surface' },
                { id: 'c', text: 'Bobs up and down, then sinks' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={(e) => { e.preventDefault(); handlePrediction(opt.id); }}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    prediction === opt.id
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                  }`}
                >
                  <span className={prediction === opt.id ? 'text-blue-300' : 'text-slate-300'}>{opt.text}</span>
                </button>
              ))}
            </div>

            {prediction && (
              <button
                onMouseDown={(e) => { e.preventDefault(); goToPhase('play'); }}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
              >
                Test It!
              </button>
            )}
          </div>
        );

      case 'play':
        return (
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Floating Paperclip Experiment</h2>
            <p className="text-slate-400 mb-4">Choose how to place the paperclip on water</p>

            <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
              <svg viewBox="0 0 400 230" className="w-full h-52">
                <rect x="50" y="100" width="300" height="110" fill="#1e40af" rx="8" />
                <rect x="55" y="105" width="290" height="100" fill="#3b82f6" rx="5" />

                {clipState === 'floating' && (
                  <path
                    d={`M 55,105 Q 150,105 ${200 - dimpleDepth * 3},${105 + dimpleDepth} Q ${200 + dimpleDepth * 3},105 345,105`}
                    fill="#60a5fa"
                    opacity="0.6"
                  />
                )}

                <g transform={`translate(170, ${clipY})`}>
                  <path
                    d="M 5,5 L 5,15 Q 5,20 10,20 L 50,20 Q 55,20 55,15 L 55,5 Q 55,0 50,0 L 15,0 Q 10,0 10,5 L 10,12"
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </g>

                {clipState === 'floating' && (
                  <text x="200" y="75" textAnchor="middle" fill="#22c55e" fontSize="14" fontWeight="bold">
                    It floats!
                  </text>
                )}

                {clipState === 'sinking' && clipY > 100 && (
                  <text x="200" y="75" textAnchor="middle" fill="#ef4444" fontSize="14" fontWeight="bold">
                    It sinks!
                  </text>
                )}
              </svg>
            </div>

            {!hasDropped && (
              <div className="flex gap-3 mb-4">
                <button
                  onMouseDown={(e) => { e.preventDefault(); setDropMethod('gentle'); }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    dropMethod === 'gentle' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  Gentle Place
                </button>
                <button
                  onMouseDown={(e) => { e.preventDefault(); setDropMethod('dropped'); }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    dropMethod === 'dropped' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  Drop It
                </button>
              </div>
            )}

            <div className="flex gap-3 mb-4">
              {!hasDropped ? (
                <button
                  onMouseDown={(e) => { e.preventDefault(); dropClip(); }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
                >
                  {dropMethod === 'gentle' ? 'Place Gently' : 'Drop!'}
                </button>
              ) : (
                <button
                  onMouseDown={(e) => { e.preventDefault(); resetSimulation(); }}
                  className="px-6 py-3 bg-slate-700 text-white font-semibold rounded-xl"
                >
                  Reset
                </button>
              )}
            </div>

            {hasDropped && (clipState === 'floating' || clipY > 150) && !showResult && (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowResult(true);
                  if (onGameEvent) {
                    onGameEvent({ type: 'result', phase: 'play', prediction, actual: 'b', correct: prediction === 'b' });
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
              >
                See Results
              </button>
            )}

            {showResult && (
              <div className={`mt-4 p-4 rounded-xl max-w-md ${prediction === 'b' ? 'bg-emerald-500/20 border border-emerald-500' : 'bg-amber-500/20 border border-amber-500'}`}>
                <p className={`font-semibold ${prediction === 'b' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {prediction === 'b' ? 'Correct!' : 'Surprising, right?'}
                </p>
                <p className="text-slate-300 text-sm mt-2">
                  When gently placed, the paperclip <strong>floats</strong>! Surface tension creates
                  an invisible "skin" on the water that supports the paperclip despite steel being
                  8× denser than water.
                </p>
                <button
                  onMouseDown={(e) => { e.preventDefault(); goToPhase('review'); }}
                  className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
                >
                  Learn the Physics
                </button>
              </div>
            )}
          </div>
        );

      case 'review':
        return (
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-white mb-6">The Physics of Surface Support</h2>

            <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6 max-w-xl mb-6">
              <h3 className="text-xl font-bold text-blue-400 mb-4">Why It Floats</h3>

              <svg viewBox="0 0 300 140" className="w-full h-32 mb-4">
                <rect x="20" y="70" width="260" height="60" fill="#3b82f6" opacity="0.3" />
                <path d="M 20,70 Q 100,70 150,85 Q 200,70 280,70" fill="#60a5fa" opacity="0.5" />
                <path d="M 20,70 Q 100,70 150,85 Q 200,70 280,70" fill="none" stroke="#1d4ed8" strokeWidth="2" />

                <g transform="translate(125, 75)">
                  <rect x="0" y="0" width="50" height="8" fill="#64748b" rx="2" />
                </g>

                <path d="M 150,95 L 150,120" stroke="#ef4444" strokeWidth="3" />
                <polygon points="150,125 145,118 155,118" fill="#ef4444" />
                <text x="165" y="120" fill="#ef4444" fontSize="10" fontWeight="bold">W</text>

                <path d="M 125,80 L 95,60" stroke="#22c55e" strokeWidth="2" />
                <path d="M 175,80 L 205,60" stroke="#22c55e" strokeWidth="2" />

                <text x="75" y="55" fill="#22c55e" fontSize="9">F = γL sin(θ)</text>
                <text x="150" y="25" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                  Vertical components balance weight!
                </text>
              </svg>

              <div className="bg-slate-800 rounded-lg p-3 mb-3">
                <p className="text-center font-bold text-blue-400">F<sub>vertical</sub> = γ × L × sin(θ)</p>
                <p className="text-center text-xs text-slate-400 mt-1">γ = surface tension, L = perimeter, θ = contact angle</p>
              </div>

              <p className="text-slate-300 text-sm">
                When F<sub>vertical</sub> ≥ Weight, the object floats!
              </p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 max-w-xl mb-6">
              <h4 className="font-bold text-amber-400 mb-2">Why Dropping Fails</h4>
              <p className="text-slate-300 text-sm">
                When dropped, the paperclip hits with enough momentum to
                <strong> punch through</strong> the surface tension barrier before it can
                deform and support the weight.
              </p>
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase('twist_predict'); }}
              className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
            >
              Try a Twist!
            </button>
          </div>
        );

      case 'twist_predict':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-6">The Soap Test</h2>
            <p className="text-slate-400 mb-6 text-center max-w-md">
              A paperclip is floating on water. What happens if you add a drop of
              dish soap to the water?
            </p>

            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'a', text: 'Paperclip floats higher (soap makes water "slippery")' },
                { id: 'b', text: "Nothing changes (soap doesn't affect floating)" },
                { id: 'c', text: 'Paperclip sinks immediately' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(opt.id); }}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    twistPrediction === opt.id
                      ? 'border-amber-500 bg-amber-500/20'
                      : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                  }`}
                >
                  <span className={twistPrediction === opt.id ? 'text-amber-300' : 'text-slate-300'}>{opt.text}</span>
                </button>
              ))}
            </div>

            {twistPrediction && (
              <button
                onMouseDown={(e) => { e.preventDefault(); goToPhase('twist_play'); }}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
              >
                Add the Soap!
              </button>
            )}
          </div>
        );

      case 'twist_play':
        return (
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-4">The Soap Experiment</h2>
            <p className="text-slate-400 mb-4">The paperclip is floating. Add soap to see what happens!</p>

            <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
              <svg viewBox="0 0 400 220" className="w-full h-52">
                <rect x="50" y="80" width="300" height="120" fill="#1e40af" rx="8" />
                <rect x="55" y="85" width="290" height="110" fill={soapAdded ? '#a855f7' : '#3b82f6'} style={{ transition: 'fill 1s' }} rx="5" />

                {twistClipState === 'floating' && (
                  <path d="M 55,85 Q 150,85 200,92 Q 250,85 345,85" fill="#60a5fa" opacity="0.5" />
                )}

                <g transform={`translate(170, ${twistClipY})`}>
                  <path
                    d="M 5,5 L 5,15 Q 5,20 10,20 L 50,20 Q 55,20 55,15 L 55,5 Q 55,0 50,0 L 15,0 Q 10,0 10,5 L 10,12"
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </g>

                {!soapAdded && (
                  <g transform="translate(50, 10)" style={{ cursor: 'pointer' }} onMouseDown={addSoapToWater}>
                    <rect x="10" y="15" width="35" height="50" fill="#a855f7" rx="5" />
                    <rect x="15" y="0" width="25" height="20" fill="#7c3aed" rx="3" />
                    <text x="27" y="45" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">SOAP</text>
                    <text x="27" y="80" textAnchor="middle" fill="#94a3b8" fontSize="10">Click to add!</text>
                  </g>
                )}

                {twistClipState === 'sunk' && (
                  <text x="200" y="60" textAnchor="middle" fill="#ef4444" fontSize="14" fontWeight="bold">
                    SUNK!
                  </text>
                )}
              </svg>
            </div>

            {soapAdded && (
              <button
                onMouseDown={(e) => { e.preventDefault(); resetTwist(); }}
                className="px-6 py-2 bg-slate-700 text-white font-semibold rounded-xl mb-4"
              >
                Reset
              </button>
            )}

            {twistClipState === 'sunk' && !showTwistResult && (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowTwistResult(true);
                  if (onGameEvent) {
                    onGameEvent({ type: 'result', phase: 'twist_play', prediction: twistPrediction, actual: 'c', correct: twistPrediction === 'c' });
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
              >
                See Results
              </button>
            )}

            {showTwistResult && (
              <div className={`mt-4 p-4 rounded-xl max-w-md ${twistPrediction === 'c' ? 'bg-emerald-500/20 border border-emerald-500' : 'bg-amber-500/20 border border-amber-500'}`}>
                <p className={`font-semibold ${twistPrediction === 'c' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {twistPrediction === 'c' ? 'Correct!' : "Dramatic, isn't it?"}
                </p>
                <p className="text-slate-300 text-sm mt-2">
                  The paperclip <strong>sinks immediately</strong>! Soap is a surfactant that
                  breaks the hydrogen bonds creating surface tension.
                </p>
                <button
                  onMouseDown={(e) => { e.preventDefault(); goToPhase('twist_review'); }}
                  className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
                >
                  Understand Why
                </button>
              </div>
            )}
          </div>
        );

      case 'twist_review':
        return (
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-6">Surface Tension: The Make-or-Break Force</h2>

            <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-6 max-w-xl mb-6">
              <h3 className="text-lg font-bold text-amber-400 mb-4">Before vs After Soap</h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-emerald-500/20 rounded-lg p-3 text-center">
                  <p className="font-bold text-emerald-400">Clean Water</p>
                  <p className="text-2xl font-bold text-emerald-300">γ = 0.072 N/m</p>
                  <p className="text-xs text-emerald-300">Strong surface tension</p>
                </div>
                <div className="bg-red-500/20 rounded-lg p-3 text-center">
                  <p className="font-bold text-red-400">Soapy Water</p>
                  <p className="text-2xl font-bold text-red-300">γ ≈ 0.025 N/m</p>
                  <p className="text-xs text-red-300">~65% reduction!</p>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-center text-red-400">γ<sub>soap</sub> × L × sin(θ) &lt; Weight</p>
                <p className="text-center text-xs text-slate-400 mt-1">Surface tension force can no longer support the clip</p>
              </div>
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase('transfer'); }}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
            >
              See Real Applications
            </button>
          </div>
        );

      case 'transfer':
        return (
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Surface Tension in Nature & Technology</h2>
            <p className="text-slate-400 mb-6">Explore each application to unlock the test</p>

            <div className="grid grid-cols-2 gap-4 w-full max-w-lg mb-6">
              {applications.map((app, index) => (
                <button
                  key={index}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setCompletedApps(prev => new Set([...prev, index]));
                    playSound('complete');
                  }}
                  className={`p-4 rounded-xl text-center transition-all ${
                    completedApps.has(index)
                      ? 'bg-emerald-500/20 border-2 border-emerald-500'
                      : 'bg-slate-800/50 border-2 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <span className="text-3xl">{app.icon}</span>
                  <p className="text-sm font-medium mt-2 text-slate-300">{app.title}</p>
                  {completedApps.has(index) && <span className="text-emerald-400 text-xs">Explored</span>}
                </button>
              ))}
            </div>

            <p className="text-slate-400 mb-4">{completedApps.size} / {applications.length} applications explored</p>

            {completedApps.size >= applications.length && (
              <button
                onMouseDown={(e) => { e.preventDefault(); goToPhase('test'); }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
              >
                Take the Test
              </button>
            )}
          </div>
        );

      case 'test':
        const score = testQuestions.reduce((acc, tq, i) => acc + (testAnswers[i] === tq.correct ? 1 : 0), 0);

        if (testSubmitted) {
          return (
            <div className="flex flex-col items-center p-6 text-center">
              <div className="text-6xl mb-4">{score >= 7 ? '🏆' : '📚'}</div>
              <h2 className="text-3xl font-bold text-white mb-2">Score: {score}/{testQuestions.length}</h2>
              <p className="text-slate-400 mb-6">{score >= 7 ? 'Excellent! Surface tension mastered!' : 'Keep studying!'}</p>

              {score >= 7 ? (
                <button
                  onMouseDown={(e) => { e.preventDefault(); goToPhase('mastery'); }}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
                >
                  Complete Journey
                </button>
              ) : (
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setTestSubmitted(false);
                    setTestAnswers({});
                    goToPhase('review');
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
                >
                  Review & Try Again
                </button>
              )}
            </div>
          );
        }

        return (
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Surface Tension Mastery Test</h2>

            <div className="space-y-4 w-full max-w-2xl max-h-96 overflow-y-auto mb-4">
              {testQuestions.map((tq, qi) => (
                <div key={qi} className="bg-slate-800/50 rounded-xl p-4">
                  <p className="font-semibold text-white mb-3">{qi + 1}. {tq.q}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {tq.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qi, oi); }}
                        className={`p-2 rounded-lg text-left text-sm transition-all ${
                          testAnswers[qi] === oi ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); submitTest(); }}
              disabled={Object.keys(testAnswers).length < testQuestions.length}
              className={`px-6 py-3 rounded-xl font-semibold ${
                Object.keys(testAnswers).length < testQuestions.length
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
              }`}
            >
              Submit Test ({Object.keys(testAnswers).length}/{testQuestions.length})
            </button>
          </div>
        );

      case 'mastery':
        const finalScore = testQuestions.reduce((acc, tq, i) => acc + (testAnswers[i] === tq.correct ? 1 : 0), 0);

        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
            <div className="bg-gradient-to-br from-blue-900/50 via-cyan-900/50 to-teal-900/50 rounded-3xl p-8 max-w-2xl">
              <div className="text-8xl mb-6">📎💧</div>
              <h1 className="text-3xl font-bold text-white mb-4">Surface Tension Master!</h1>
              <p className="text-xl text-slate-300 mb-6">
                You now understand how water's invisible "skin" can support
                objects much denser than water itself!
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-blue-400">{finalScore}/{testQuestions.length}</div>
                  <p className="text-sm text-slate-400">Test Score</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-blue-400">4</div>
                  <p className="text-sm text-slate-400">Applications</p>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 text-left mb-6">
                <p className="font-semibold text-white mb-2">Key Takeaways:</p>
                <ul className="text-sm text-slate-400 space-y-1">
                  <li>• Surface tension creates a supportive "skin"</li>
                  <li>• F = γ × L × sin(θ) for vertical force</li>
                  <li>• Gentle placement allows surface to deform</li>
                  <li>• Soap breaks hydrogen bonds → sinking</li>
                </ul>
              </div>

              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (onGameEvent) {
                    onGameEvent({ type: 'complete', score: finalScore, total: testQuestions.length });
                  }
                  playSound('complete');
                }}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold text-lg rounded-xl"
              >
                Complete Lesson
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const currentIndex = phaseOrder.indexOf(phase);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Floating Paperclip</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-blue-400 w-6 shadow-lg shadow-blue-400/30'
                    : currentIndex > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-blue-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
}
