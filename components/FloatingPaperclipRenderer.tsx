'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────
// FloatingPaperclipRenderer – Teach surface tension support
// ─────────────────────────────────────────────────────────────
// Physics: Surface tension creates a "skin" supporting heavy objects
// Steel paperclip floats despite being 8× denser than water
// Force balance: Weight = Surface tension × perimeter × sin(θ)
// Surface tension γ creates upward force F = γ × perimeter × cos(θ)

interface FloatingPaperclipRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
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

// Liquid properties for comparison
const liquidProperties: Record<string, { gamma: number; color: string; name: string }> = {
  water: { gamma: 0.072, color: '#3b82f6', name: 'Water' },
  oil: { gamma: 0.032, color: '#eab308', name: 'Oil' },
  alcohol: { gamma: 0.022, color: '#a855f7', name: 'Alcohol' },
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function FloatingPaperclipRenderer({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}: FloatingPaperclipRendererProps) {
  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
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

  // Interactive parameters for play phase
  const [surfaceTension, setSurfaceTension] = useState(0.072); // N/m (water default)
  const [clipWeight, setClipWeight] = useState(0.5); // grams
  const [waterTemperature, setWaterTemperature] = useState(20); // Celsius
  const [showForceVectors, setShowForceVectors] = useState(true);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Twist state - add soap
  const [soapAdded, setSoapAdded] = useState(false);
  const [twistClipY, setTwistClipY] = useState(60);
  const [twistClipState, setTwistClipState] = useState<'floating' | 'sinking' | 'sunk'>('floating');

  // Twist play interactive parameters
  const [soapAmount, setSoapAmount] = useState(0); // 0-100%
  const [selectedLiquid, setSelectedLiquid] = useState<'water' | 'oil' | 'alcohol'>('water');
  const [contactAngle, setContactAngle] = useState(45); // degrees

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

    onPhaseComplete?.();
    playSound('transition');
  }, [onPhaseComplete, playSound]);

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
    setSoapAmount(0);
  };

  // Calculate effective surface tension based on temperature and soap
  const getEffectiveSurfaceTension = useCallback(() => {
    // Temperature effect: surface tension decreases ~0.15% per degree C above 20
    const tempFactor = 1 - (waterTemperature - 20) * 0.0015;
    // Soap effect: reduces surface tension dramatically
    const soapFactor = 1 - (soapAmount / 100) * 0.65;
    // Liquid base value
    const baseGamma = liquidProperties[selectedLiquid]?.gamma || 0.072;
    return baseGamma * tempFactor * soapFactor;
  }, [waterTemperature, soapAmount, selectedLiquid]);

  // Calculate if paperclip floats based on physics
  const calculateFloatability = useCallback(() => {
    const gamma = getEffectiveSurfaceTension();
    const perimeter = 0.08; // approx 8cm for standard paperclip
    const theta = contactAngle * (Math.PI / 180);
    const surfaceForce = gamma * perimeter * Math.cos(theta);
    const weight = (clipWeight / 1000) * 9.81; // Convert g to N
    return surfaceForce >= weight;
  }, [getEffectiveSurfaceTension, contactAngle, clipWeight]);

  // Animation for force vectors
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 60);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handlePrediction = (choice: string) => {
    setPrediction(choice);
    playSound('click');
  };

  const handleTwistPrediction = (choice: string) => {
    setTwistPrediction(choice);
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
    const score = testQuestions.reduce((acc, q, i) => {
      if (testAnswers[i] !== undefined && q.options[testAnswers[i]]?.correct) {
        return acc + 1;
      }
      return acc;
    }, 0);
    if (score >= 7) {
      onCorrectAnswer?.();
      playSound('success');
    } else {
      onIncorrectAnswer?.();
      playSound('failure');
    }
  };

  const testQuestions = [
    {
      question: "Why does a steel paperclip float on water?",
      options: [
        { text: "Steel is less dense than water", correct: false },
        { text: "Surface tension supports it", correct: true },
        { text: "Air bubbles hold it up", correct: false },
        { text: "The paperclip is hollow", correct: false }
      ],
    },
    {
      question: "What visible feature shows surface tension supporting the paperclip?",
      options: [
        { text: "Bubbles around the clip", correct: false },
        { text: "Color change in water", correct: false },
        { text: "A dimple in the water surface", correct: true },
        { text: "Ripples spreading outward", correct: false }
      ],
    },
    {
      question: "Why does a dropped paperclip sink but a gently placed one floats?",
      options: [
        { text: "Dropped clip is heavier", correct: false },
        { text: "Gentle placement allows surface tension to form gradually", correct: true },
        { text: "Water temperature changes", correct: false },
        { text: "Air pressure pushes it down", correct: false }
      ],
    },
    {
      question: "What happens when you add soap to water with a floating paperclip?",
      options: [
        { text: "The clip floats higher", correct: false },
        { text: "Nothing changes", correct: false },
        { text: "The clip immediately sinks", correct: true },
        { text: "The water turns cloudy", correct: false }
      ],
    },
    {
      question: "Which formula relates surface tension force to contact angle?",
      options: [
        { text: "F = mg", correct: false },
        { text: "F = γ × L × sin(θ)", correct: true },
        { text: "F = ρgh", correct: false },
        { text: "F = ma", correct: false }
      ],
    },
    {
      question: "Why can water striders walk on water?",
      options: [
        { text: "They are very light", correct: false },
        { text: "Their legs have oils and hairs that don't break surface tension", correct: true },
        { text: "They move too fast to sink", correct: false },
        { text: "Water pushes them up", correct: false }
      ],
    },
    {
      question: "What is the approximate density ratio of steel to water?",
      options: [
        { text: "1:1 (same density)", correct: false },
        { text: "2:1", correct: false },
        { text: "5:1", correct: false },
        { text: "8:1", correct: true }
      ],
    },
    {
      question: "What determines the maximum weight surface tension can support?",
      options: [
        { text: "Water depth", correct: false },
        { text: "Contact perimeter and contact angle", correct: true },
        { text: "Water color", correct: false },
        { text: "Container shape", correct: false }
      ],
    },
    {
      question: "Why does a needle float better when placed parallel to the water surface?",
      options: [
        { text: "It's lighter that way", correct: false },
        { text: "More contact length means more surface tension force", correct: true },
        { text: "The needle is magnetic", correct: false },
        { text: "Air gets trapped underneath", correct: false }
      ],
    },
    {
      question: "What natural phenomenon uses surface tension for survival?",
      options: [
        { text: "Birds flying", correct: false },
        { text: "Fish swimming", correct: false },
        { text: "Insects walking on water", correct: true },
        { text: "Plants absorbing sunlight", correct: false }
      ],
    }
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
              onClick={() => goToPhase('predict')}
              style={{ zIndex: 10 }}
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
                  onClick={() => handlePrediction(opt.id)}
                  style={{ zIndex: 10 }}
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
                onClick={() => goToPhase('play')}
                style={{ zIndex: 10 }}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
              >
                Test It!
              </button>
            )}
          </div>
        );

      case 'play':
        const effectiveGamma = getEffectiveSurfaceTension();
        const willFloat = calculateFloatability();
        const perimeter = 0.08;
        const theta = contactAngle * (Math.PI / 180);
        const surfaceForceN = effectiveGamma * perimeter * Math.cos(theta);
        const weightForceN = (clipWeight / 1000) * 9.81;
        const forceRatio = surfaceForceN / weightForceN;
        const criticalPoint = forceRatio < 1;

        return (
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Floating Paperclip Experiment</h2>
            <p className="text-slate-400 mb-4">Adjust parameters to explore surface tension physics</p>

            {/* Interactive Parameter Controls */}
            <div className="bg-slate-800/60 rounded-2xl p-4 mb-4 w-full max-w-xl border border-slate-700/50">
              <h3 className="text-sm font-semibold text-blue-400 mb-3">Experiment Controls</h3>

              {/* Surface Tension Slider */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-400">Surface Tension Coefficient</label>
                  <span className="text-xs font-mono text-blue-300">{surfaceTension.toFixed(3)} N/m</span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.08"
                  step="0.001"
                  value={surfaceTension}
                  onChange={(e) => setSurfaceTension(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  style={{ zIndex: 10 }}
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Alcohol (0.02)</span>
                  <span>Water (0.072)</span>
                </div>
              </div>

              {/* Paperclip Weight Slider */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-400">Paperclip Weight/Size</label>
                  <span className="text-xs font-mono text-cyan-300">{clipWeight.toFixed(2)} g</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.1"
                  value={clipWeight}
                  onChange={(e) => setClipWeight(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  style={{ zIndex: 10 }}
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Small (0.2g)</span>
                  <span>Large (2.0g)</span>
                </div>
              </div>

              {/* Water Temperature Slider */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-400">Water Temperature</label>
                  <span className="text-xs font-mono text-amber-300">{waterTemperature}°C</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="80"
                  step="1"
                  value={waterTemperature}
                  onChange={(e) => setWaterTemperature(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  style={{ zIndex: 10 }}
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Cold (5°C)</span>
                  <span>Hot (80°C)</span>
                </div>
              </div>

              {/* Toggle Force Vectors */}
              <button
                onClick={() => setShowForceVectors(!showForceVectors)}
                style={{ zIndex: 10 }}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                  showForceVectors ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {showForceVectors ? 'Hide Force Vectors' : 'Show Force Vectors'}
              </button>
            </div>

            {/* Interactive SVG Visualization */}
            <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-xl">
              <svg viewBox="0 0 400 280" className="w-full h-64">
                {/* Water container */}
                <rect x="50" y="100" width="300" height="150" fill="#1e40af" rx="8" />
                <rect x="55" y="105" width="290" height="140" fill="#3b82f6" rx="5" />

                {/* Animated water surface with dimple */}
                {clipState === 'floating' && (
                  <>
                    {/* Surface dimple visualization */}
                    <path
                      d={`M 55,105
                          Q 120,105 ${170 - dimpleDepth * 2},${105 + dimpleDepth * 0.5}
                          Q 200,${105 + dimpleDepth * 1.5} ${230 + dimpleDepth * 2},${105 + dimpleDepth * 0.5}
                          Q 280,105 345,105`}
                      fill="#60a5fa"
                      opacity="0.7"
                    />
                    {/* Animated ripples */}
                    <ellipse
                      cx="200"
                      cy="105"
                      rx={50 + Math.sin(animationFrame * 0.2) * 5}
                      ry={3 + Math.sin(animationFrame * 0.2) * 1}
                      fill="none"
                      stroke="#93c5fd"
                      strokeWidth="0.5"
                      opacity={0.5 - (animationFrame % 30) / 60}
                    />
                  </>
                )}

                {/* Paperclip */}
                <g transform={`translate(170, ${clipY})`}>
                  <path
                    d="M 5,5 L 5,15 Q 5,20 10,20 L 50,20 Q 55,20 55,15 L 55,5 Q 55,0 50,0 L 15,0 Q 10,0 10,5 L 10,12"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth={3 + clipWeight * 0.5}
                    strokeLinecap="round"
                  />
                  {/* Highlight */}
                  <path d="M 8,3 L 12,3" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
                </g>

                {/* Force Vectors (when floating) */}
                {showForceVectors && clipState === 'floating' && (
                  <g>
                    {/* Weight force (down) */}
                    <defs>
                      <marker id="arrowRed" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                        <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
                      </marker>
                      <marker id="arrowGreen" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                        <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
                      </marker>
                    </defs>

                    {/* Weight arrow */}
                    <line
                      x1="200" y1={clipY + 25}
                      x2="200" y2={clipY + 25 + weightForceN * 300}
                      stroke="#ef4444"
                      strokeWidth="3"
                      markerEnd="url(#arrowRed)"
                    />
                    <text x="215" y={clipY + 40} fill="#ef4444" fontSize="10" fontWeight="bold">W</text>

                    {/* Surface tension forces (up and outward) */}
                    {/* Left force */}
                    <line
                      x1="175" y1={clipY + 20}
                      x2={175 - surfaceForceN * 200} y2={clipY + 20 - surfaceForceN * 300}
                      stroke="#22c55e"
                      strokeWidth="2"
                      markerEnd="url(#arrowGreen)"
                    />
                    {/* Right force */}
                    <line
                      x1="225" y1={clipY + 20}
                      x2={225 + surfaceForceN * 200} y2={clipY + 20 - surfaceForceN * 300}
                      stroke="#22c55e"
                      strokeWidth="2"
                      markerEnd="url(#arrowGreen)"
                    />

                    {/* Force labels */}
                    <text x="130" y={clipY - 5} fill="#22c55e" fontSize="9">F = {(surfaceForceN * 1000).toFixed(2)} mN</text>
                    <text x="240" y={clipY - 5} fill="#22c55e" fontSize="9">F = {(surfaceForceN * 1000).toFixed(2)} mN</text>

                    {/* Contact angle arc */}
                    <path
                      d={`M 175,${clipY + 20} A 15 15 0 0 1 ${175 - 10},${clipY + 10}`}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                    <text x="150" y={clipY + 15} fill="#fbbf24" fontSize="8">θ={contactAngle}°</text>
                  </g>
                )}

                {/* Critical Point Warning */}
                {criticalPoint && !hasDropped && (
                  <g>
                    <rect x="120" y="60" width="160" height="25" fill="#ef4444" opacity="0.2" rx="4" />
                    <text x="200" y="77" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="bold">
                      CRITICAL: Will sink with these settings!
                    </text>
                  </g>
                )}

                {clipState === 'floating' && (
                  <text x="200" y="75" textAnchor="middle" fill="#22c55e" fontSize="14" fontWeight="bold">
                    It floats! (Force ratio: {forceRatio.toFixed(2)})
                  </text>
                )}

                {clipState === 'sinking' && clipY > 100 && (
                  <text x="200" y="75" textAnchor="middle" fill="#ef4444" fontSize="14" fontWeight="bold">
                    It sinks! Surface tension insufficient
                  </text>
                )}

                {/* Physics formula display */}
                <rect x="55" y="220" width="290" height="35" fill="#1e293b" rx="4" />
                <text x="200" y="238" textAnchor="middle" fill="#94a3b8" fontSize="10">
                  F = γ × L × cos(θ) = {effectiveGamma.toFixed(3)} × 0.08 × cos({contactAngle}°)
                </text>
                <text x="200" y="250" textAnchor="middle" fill={willFloat ? '#22c55e' : '#ef4444'} fontSize="10" fontWeight="bold">
                  = {(surfaceForceN * 1000).toFixed(2)} mN {willFloat ? '≥' : '<'} {(weightForceN * 1000).toFixed(2)} mN (Weight)
                </text>
              </svg>
            </div>

            {/* Drop Method Selection */}
            {!hasDropped && (
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => setDropMethod('gentle')}
                  style={{ zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    dropMethod === 'gentle' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  Gentle Place
                </button>
                <button
                  onClick={() => setDropMethod('dropped')}
                  style={{ zIndex: 10 }}
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
                  onClick={() => dropClip()}
                  style={{ zIndex: 10 }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
                >
                  {dropMethod === 'gentle' ? 'Place Gently' : 'Drop!'}
                </button>
              ) : (
                <button
                  onClick={() => resetSimulation()}
                  style={{ zIndex: 10 }}
                  className="px-6 py-3 bg-slate-700 text-white font-semibold rounded-xl"
                >
                  Reset
                </button>
              )}
            </div>

            {hasDropped && (clipState === 'floating' || clipY > 150) && !showResult && (
              <button
                onClick={() => {
                  setShowResult(true);
                  if (prediction === 'b') {
                    onCorrectAnswer?.();
                  } else {
                    onIncorrectAnswer?.();
                  }
                }}
                style={{ zIndex: 10 }}
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
                  onClick={() => goToPhase('review')}
                  style={{ zIndex: 10 }}
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
              onClick={() => goToPhase('twist_predict')}
              style={{ zIndex: 10 }}
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
                  onClick={() => handleTwistPrediction(opt.id)}
                  style={{ zIndex: 10 }}
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
                onClick={() => goToPhase('twist_play')}
                style={{ zIndex: 10 }}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
              >
                Add the Soap!
              </button>
            )}
          </div>
        );

      case 'twist_play':
        const twistEffectiveGamma = liquidProperties[selectedLiquid].gamma * (1 - soapAmount / 100 * 0.65);
        const twistWillFloat = twistEffectiveGamma * 0.08 * Math.cos(contactAngle * Math.PI / 180) >= (clipWeight / 1000) * 9.81;
        const liquidColor = liquidProperties[selectedLiquid].color;

        return (
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-4">Surface Tension Laboratory</h2>
            <p className="text-slate-400 mb-4">Explore how soap and different liquids affect surface tension</p>

            {/* Interactive Controls for Twist Phase */}
            <div className="bg-slate-800/60 rounded-2xl p-4 mb-4 w-full max-w-xl border border-amber-500/30">
              <h3 className="text-sm font-semibold text-amber-400 mb-3">Experiment Variables</h3>

              {/* Soap/Detergent Slider */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-400">Soap/Detergent Amount</label>
                  <span className="text-xs font-mono text-purple-300">{soapAmount}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={soapAmount}
                  onChange={(e) => {
                    const newAmount = parseInt(e.target.value);
                    setSoapAmount(newAmount);
                    if (newAmount > 30 && twistClipState === 'floating') {
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
                    }
                  }}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  style={{ zIndex: 10 }}
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>None</span>
                  <span>Max detergent</span>
                </div>
                <p className="text-xs text-purple-400 mt-1">
                  Effective γ: {twistEffectiveGamma.toFixed(3)} N/m ({((1 - twistEffectiveGamma / liquidProperties[selectedLiquid].gamma) * 100).toFixed(0)}% reduction)
                </p>
              </div>

              {/* Liquid Selection */}
              <div className="mb-4">
                <label className="text-xs text-slate-400 block mb-2">Compare Different Liquids</label>
                <div className="flex gap-2">
                  {(Object.keys(liquidProperties) as Array<'water' | 'oil' | 'alcohol'>).map((liquid) => (
                    <button
                      key={liquid}
                      onClick={() => {
                        setSelectedLiquid(liquid);
                        resetTwist();
                      }}
                      style={{ zIndex: 10 }}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center ${
                        selectedLiquid === liquid
                          ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <span className="capitalize">{liquidProperties[liquid].name}</span>
                      <span className="text-xs opacity-70">γ = {liquidProperties[liquid].gamma}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Angle Slider */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-400">Contact Angle (θ)</label>
                  <span className="text-xs font-mono text-amber-300">{contactAngle}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={contactAngle}
                  onChange={(e) => setContactAngle(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  style={{ zIndex: 10 }}
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0° (Flat)</span>
                  <span>90° (Steep)</span>
                </div>
                <p className="text-xs text-amber-400 mt-1">
                  cos(θ) = {Math.cos(contactAngle * Math.PI / 180).toFixed(3)} — affects vertical force component
                </p>
              </div>

              {/* Float Prediction Display */}
              <div className={`p-2 rounded-lg text-center ${twistWillFloat ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                <p className={`text-sm font-semibold ${twistWillFloat ? 'text-emerald-400' : 'text-red-400'}`}>
                  {twistWillFloat ? 'Paperclip WILL float' : 'Paperclip WILL SINK'}
                </p>
              </div>
            </div>

            {/* Animated SVG Visualization */}
            <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-xl">
              <svg viewBox="0 0 400 280" className="w-full h-60">
                {/* Container */}
                <rect x="50" y="80" width="300" height="160" fill="#1e40af" rx="8" />
                <rect
                  x="55"
                  y="85"
                  width="290"
                  height="150"
                  fill={soapAmount > 0 ? `${liquidColor}88` : liquidColor}
                  style={{ transition: 'fill 0.5s' }}
                  rx="5"
                />

                {/* Liquid label */}
                <text x="320" y="130" fill="white" fontSize="10" fontWeight="bold" opacity="0.7">
                  {liquidProperties[selectedLiquid].name}
                </text>

                {/* Surface dimple when floating */}
                {twistClipState === 'floating' && (
                  <>
                    <path
                      d={`M 55,85 Q 140,85 ${180 - 10},${85 + 8} Q 200,${85 + 12} ${220 + 10},${85 + 8} Q 260,85 345,85`}
                      fill={`${liquidColor}aa`}
                      style={{ transition: 'all 0.3s' }}
                    />
                    {/* Contact angle visualization */}
                    <line
                      x1="175" y1="93"
                      x2={175 - 20 * Math.cos(contactAngle * Math.PI / 180)}
                      y2={93 - 20 * Math.sin(contactAngle * Math.PI / 180)}
                      stroke="#fbbf24"
                      strokeWidth="1.5"
                      strokeDasharray="3,3"
                    />
                    <path
                      d={`M 175,93 A 10 10 0 0 1 ${175 - 8},${88}`}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1"
                    />
                    <text x="155" y="80" fill="#fbbf24" fontSize="9">θ={contactAngle}°</text>
                  </>
                )}

                {/* Soap bubbles animation */}
                {soapAmount > 0 && (
                  <g>
                    {Array.from({ length: Math.floor(soapAmount / 20) }).map((_, i) => (
                      <circle
                        key={i}
                        cx={100 + i * 60 + Math.sin(animationFrame * 0.1 + i) * 10}
                        cy={150 + Math.cos(animationFrame * 0.15 + i * 2) * 20}
                        r={3 + i}
                        fill="white"
                        opacity={0.2 + (i * 0.1)}
                      />
                    ))}
                  </g>
                )}

                {/* Paperclip */}
                <g transform={`translate(170, ${twistClipY})`}>
                  <path
                    d="M 5,5 L 5,15 Q 5,20 10,20 L 50,20 Q 55,20 55,15 L 55,5 Q 55,0 50,0 L 15,0 Q 10,0 10,5 L 10,12"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path d="M 8,3 L 12,3" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
                </g>

                {/* Force vectors when floating */}
                {twistClipState === 'floating' && showForceVectors && (
                  <g>
                    <defs>
                      <marker id="arrowRedTwist" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                        <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
                      </marker>
                      <marker id="arrowGreenTwist" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                        <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
                      </marker>
                    </defs>
                    {/* Weight */}
                    <line x1="200" y1="85" x2="200" y2="115" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowRedTwist)" />
                    <text x="208" y="105" fill="#ef4444" fontSize="9">W</text>
                    {/* Surface tension */}
                    <line x1="175" y1="85" x2="155" y2="65" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowGreenTwist)" />
                    <line x1="225" y1="85" x2="245" y2="65" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowGreenTwist)" />
                  </g>
                )}

                {/* Status text */}
                {twistClipState === 'sunk' && (
                  <text x="200" y="60" textAnchor="middle" fill="#ef4444" fontSize="14" fontWeight="bold">
                    SUNK! Surface tension broken
                  </text>
                )}

                {twistClipState === 'floating' && (
                  <text x="200" y="60" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">
                    Floating on {liquidProperties[selectedLiquid].name}
                  </text>
                )}

                {/* Physics display */}
                <rect x="55" y="220" width="290" height="40" fill="#1e293b" rx="4" />
                <text x="200" y="237" textAnchor="middle" fill="#94a3b8" fontSize="10">
                  Effective γ = {twistEffectiveGamma.toFixed(3)} N/m (Soap reduces by {(soapAmount * 0.65).toFixed(0)}%)
                </text>
                <text x="200" y="252" textAnchor="middle" fill={twistWillFloat ? '#22c55e' : '#ef4444'} fontSize="10" fontWeight="bold">
                  F_surface = {(twistEffectiveGamma * 0.08 * Math.cos(contactAngle * Math.PI / 180) * 1000).toFixed(2)} mN
                  {twistWillFloat ? ' ≥ ' : ' < '}
                  {((clipWeight / 1000) * 9.81 * 1000).toFixed(2)} mN (Weight)
                </text>
              </svg>
            </div>

            {/* Soap bottle click area (traditional method) */}
            {!soapAdded && soapAmount === 0 && (
              <p className="text-slate-500 text-sm mb-4">
                Use the slider above OR click the soap bottle in the visualization to add soap
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => resetTwist()}
                style={{ zIndex: 10 }}
                className="px-6 py-2 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600 transition-all"
              >
                Reset Experiment
              </button>

              <button
                onClick={() => setShowForceVectors(!showForceVectors)}
                style={{ zIndex: 10 }}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  showForceVectors ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {showForceVectors ? 'Hide Forces' : 'Show Forces'}
              </button>
            </div>

            {twistClipState === 'sunk' && !showTwistResult && (
              <button
                onClick={() => {
                  setShowTwistResult(true);
                  if (twistPrediction === 'c') {
                    onCorrectAnswer?.();
                  } else {
                    onIncorrectAnswer?.();
                  }
                }}
                style={{ zIndex: 10 }}
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
                  breaks the hydrogen bonds creating surface tension. Different liquids have
                  different base surface tensions — alcohol has the lowest, which is why it
                  evaporates quickly and spreads easily.
                </p>
                <button
                  onClick={() => goToPhase('twist_review')}
                  style={{ zIndex: 10 }}
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
              onClick={() => goToPhase('transfer')}
              style={{ zIndex: 10 }}
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
                  onClick={() => {
                    setCompletedApps(prev => new Set([...prev, index]));
                    playSound('complete');
                  }}
                  style={{ zIndex: 10 }}
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
                onClick={() => goToPhase('test')}
                style={{ zIndex: 10 }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
              >
                Take the Test
              </button>
            )}
          </div>
        );

      case 'test':
        const score = testQuestions.reduce((acc, q, i) => {
          if (testAnswers[i] !== undefined && q.options[testAnswers[i]]?.correct) {
            return acc + 1;
          }
          return acc;
        }, 0);

        if (testSubmitted) {
          return (
            <div className="flex flex-col items-center p-6 text-center">
              <div className="text-6xl mb-4">{score >= 7 ? '🏆' : '📚'}</div>
              <h2 className="text-3xl font-bold text-white mb-2">Score: {score}/{testQuestions.length}</h2>
              <p className="text-slate-400 mb-6">{score >= 7 ? 'Excellent! Surface tension mastered!' : 'Keep studying!'}</p>

              {score >= 7 ? (
                <button
                  onClick={() => goToPhase('mastery')}
                  style={{ zIndex: 10 }}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
                >
                  Complete Journey
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTestSubmitted(false);
                    setTestAnswers({});
                    goToPhase('review');
                  }}
                  style={{ zIndex: 10 }}
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
                  <p className="font-semibold text-white mb-3">{qi + 1}. {tq.question}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {tq.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => handleTestAnswer(qi, oi)}
                        style={{ zIndex: 10 }}
                        className={`p-2 rounded-lg text-left text-sm transition-all ${
                          testAnswers[qi] === oi ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                        }`}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => submitTest()}
              disabled={Object.keys(testAnswers).length < testQuestions.length}
              style={{ zIndex: 10 }}
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
        const finalScore = testQuestions.reduce((acc, q, i) => {
          if (testAnswers[i] !== undefined && q.options[testAnswers[i]]?.correct) {
            return acc + 1;
          }
          return acc;
        }, 0);

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
                onClick={() => {
                  onPhaseComplete?.();
                  playSound('complete');
                }}
                style={{ zIndex: 10 }}
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
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
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
