'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
// String phases for game progression
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PHASE_ORDER: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review', twist_predict: 'Twist Predict',
  twist_play: 'Twist Lab', twist_review: 'Twist Review', transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
};

interface Props {
  currentPhase?: Phase;
  onPhaseComplete?: (phase: Phase) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const TEST_QUESTIONS = [
  {
    question: 'Why does a highlighter glow under UV light but appear normal under regular light?',
    options: [
      'Highlighters have tiny LEDs inside',
      'UV light chemically changes the ink',
      'Fluorescent molecules absorb UV and re-emit visible light',
      'Regular light is too weak to activate the glow'
    ],
    correct: 2
  },
  {
    question: 'Why is the emitted light a different color (longer wavelength) than the absorbed UV light?',
    options: [
      'Some energy is lost as heat during the process (Stokes shift)',
      'The molecules change color when hit by light',
      'UV light bounces off and changes color',
      'The eye perceives UV as a different color'
    ],
    correct: 0
  },
  {
    question: 'Why doesn\'t regular white paper fluoresce much?',
    options: [
      'White paper is too bright already',
      'Paper lacks special fluorescent molecules',
      'Paper absorbs all UV light completely',
      'Paper is too thick for light to penetrate'
    ],
    correct: 1
  },
  {
    question: 'A mineral glows red under UV light. What wavelength is the UV light?',
    options: [
      'Longer than red (infrared)',
      'The same as red (~700nm)',
      'Shorter than red, shorter than all visible light (~365nm)',
      'It depends on the room temperature'
    ],
    correct: 2
  }
];

const TRANSFER_APPS = [
  {
    title: 'Currency Security',
    description: 'Banknotes have fluorescent inks that glow under UV to prevent counterfeiting.',
    icon: '💵'
  },
  {
    title: 'Forensics',
    description: 'Body fluids fluoresce under UV, helping investigators find evidence at crime scenes.',
    icon: '🔍'
  },
  {
    title: 'Fluorescent Lights',
    description: 'UV from mercury vapor hits phosphor coating, which fluoresces white light!',
    icon: '💡'
  },
  {
    title: 'Scorpion Detection',
    description: 'Scorpion exoskeletons contain fluorescent compounds - they glow bright cyan under UV!',
    icon: '🦂'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const FluorescenceRenderer: React.FC<Props> = ({ currentPhase, onPhaseComplete }) => {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(currentPhase ?? 'hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<number[]>([]);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [showTestResults, setShowTestResults] = useState(false);

  // Simulation state
  const [uvOn, setUvOn] = useState(false);
  const [regularLightOn, setRegularLightOn] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<'highlighter' | 'paper' | 'tonic' | 'mineral'>('highlighter');
  const [animPhase, setAnimPhase] = useState(0);

  // Twist state
  const [twistMaterial, setTwistMaterial] = useState<'highlighter_yellow' | 'highlighter_pink' | 'highlighter_green' | 'laundry_detergent'>('highlighter_yellow');

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Material fluorescence properties
  const getMaterialProps = (mat: string) => {
    const props: Record<string, { fluorescent: boolean; emitColor: string; emitGlow: string; name: string }> = {
      highlighter: { fluorescent: true, emitColor: '#22ff22', emitGlow: '#00ff00', name: 'Yellow Highlighter' },
      paper: { fluorescent: false, emitColor: '#f5f5dc', emitGlow: '#f5f5dc', name: 'Plain Paper' },
      tonic: { fluorescent: true, emitColor: '#00ccff', emitGlow: '#00ffff', name: 'Tonic Water (Quinine)' },
      mineral: { fluorescent: true, emitColor: '#ff4444', emitGlow: '#ff0000', name: 'Fluorite Mineral' },
      highlighter_yellow: { fluorescent: true, emitColor: '#22ff22', emitGlow: '#00ff00', name: 'Yellow Highlighter' },
      highlighter_pink: { fluorescent: true, emitColor: '#ff66cc', emitGlow: '#ff00ff', name: 'Pink Highlighter' },
      highlighter_green: { fluorescent: true, emitColor: '#00ffaa', emitGlow: '#00ff88', name: 'Green Highlighter' },
      laundry_detergent: { fluorescent: true, emitColor: '#6666ff', emitGlow: '#0000ff', name: 'Laundry Detergent' }
    };
    return props[mat] || props.highlighter;
  };

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

  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete]);

  const goToNextPhase = useCallback(() => {
    const currentIndex = PHASE_ORDER.indexOf(phase);
    if (currentIndex < PHASE_ORDER.length - 1) {
      goToPhase(PHASE_ORDER[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // ─── Animation Effect ────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 0.1) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setUvOn(false);
      setRegularLightOn(true);
      setSelectedMaterial('highlighter');
    }
    if (phase === 'twist_play') {
      setTwistMaterial('highlighter_yellow');
    }
  }, [phase]);

  // ─── Render Helpers ──────────────────────────────────────────────────────────
  const renderFluorescenceScene = (material: string, uvActive: boolean, regularLight: boolean) => {
    const props = getMaterialProps(material);
    const isGlowing = uvActive && props.fluorescent;
    const ambientLight = regularLight ? 0.8 : (uvActive ? 0.2 : 0.05);

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        {/* Background - dark room when UV only */}
        <rect width="400" height="280" fill={regularLight ? '#1e293b' : '#0a0a15'} />

        {/* UV Light Source */}
        <g transform="translate(320, 30)">
          <rect x="-25" y="0" width="50" height="80" rx="5" fill="#1f2937" />
          <rect x="-20" y="70" width="40" height="30" rx="3" fill={uvActive ? '#7c3aed' : '#374151'} />
          {uvActive && (
            <>
              {/* UV beam cone */}
              <path
                d="M -20 100 L -60 260 L 60 260 L 20 100 Z"
                fill="url(#uvGradient)"
                opacity="0.4"
              />
              {/* UV rays */}
              {[...Array(5)].map((_, i) => (
                <line
                  key={i}
                  x1={-15 + i * 8}
                  y1="100"
                  x2={-45 + i * 25}
                  y2="250"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  opacity={0.3 + Math.sin(animPhase + i) * 0.2}
                />
              ))}
            </>
          )}
        </g>

        {/* Gradient definitions */}
        <defs>
          <radialGradient id="uvGradient" cx="50%" cy="0%" r="100%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={props.emitGlow} stopOpacity="0.9" />
            <stop offset="50%" stopColor={props.emitGlow} stopOpacity="0.4" />
            <stop offset="100%" stopColor={props.emitGlow} stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Material/Object */}
        <g transform="translate(120, 140)">
          {/* Glow effect when fluorescent and UV active */}
          {isGlowing && (
            <ellipse
              cx="50"
              cy="60"
              rx={70 + Math.sin(animPhase) * 5}
              ry={50 + Math.sin(animPhase) * 5}
              fill="url(#glowGradient)"
              className="animate-pulse"
            />
          )}

          {/* Object base */}
          {material.includes('highlighter') && (
            <g>
              <rect x="20" y="30" width="60" height="60" rx="4" fill={isGlowing ? props.emitColor : '#fef08a'} filter={isGlowing ? 'url(#glow)' : ''} opacity={ambientLight} />
              <text x="50" y="70" textAnchor="middle" className="fill-gray-800 text-xs font-bold">TEXT</text>
            </g>
          )}
          {material === 'paper' && (
            <rect x="10" y="20" width="80" height="80" rx="2" fill={`rgba(245, 245, 220, ${ambientLight})`} />
          )}
          {material === 'tonic' && (
            <g>
              <rect x="30" y="10" width="40" height="90" rx="3" fill="#374151" />
              <rect x="35" y="25" width="30" height="70" rx="2" fill={isGlowing ? props.emitColor : `rgba(200, 230, 255, ${ambientLight})`} filter={isGlowing ? 'url(#glow)' : ''} />
              {/* Bubbles */}
              {[...Array(5)].map((_, i) => (
                <circle
                  key={i}
                  cx={40 + (i % 3) * 10}
                  cy={80 - ((animPhase * 10 + i * 15) % 50)}
                  r={2}
                  fill={isGlowing ? '#00ffff' : '#ffffff'}
                  opacity={0.5}
                />
              ))}
            </g>
          )}
          {material === 'mineral' && (
            <g>
              {/* Crystal shape */}
              <polygon
                points="50,10 80,40 70,90 30,90 20,40"
                fill={isGlowing ? props.emitColor : '#8b7355'}
                filter={isGlowing ? 'url(#glow)' : ''}
                opacity={ambientLight}
              />
              <polygon
                points="50,10 65,35 50,50 35,35"
                fill={isGlowing ? '#ff8888' : '#a0896b'}
                opacity={ambientLight * 0.8}
              />
            </g>
          )}
          {material === 'laundry_detergent' && (
            <g>
              <rect x="25" y="20" width="50" height="70" rx="5" fill="#2563eb" />
              <rect x="30" y="30" width="40" height="20" rx="2" fill={isGlowing ? props.emitColor : '#60a5fa'} filter={isGlowing ? 'url(#glow)' : ''} />
              <text x="50" y="75" textAnchor="middle" className="fill-white text-xs">SOAP</text>
            </g>
          )}
        </g>

        {/* Energy diagram (small) */}
        {uvActive && props.fluorescent && (
          <g transform="translate(20, 180)">
            <text x="0" y="0" className="fill-violet-400 text-xs">UV (short λ)</text>
            <line x1="0" y1="10" x2="30" y2="10" stroke="#8b5cf6" strokeWidth="2" markerEnd="url(#arrow)" />
            <text x="0" y="40" className="fill-gray-400 text-xs">→</text>
            <text x="15" y="55" style={{ fill: props.emitColor }} className="text-xs">Visible (long λ)</text>
            <line x1="0" y1="65" x2="30" y2="65" stroke={props.emitColor} strokeWidth="2" />
          </g>
        )}

        {/* Labels */}
        <text x="200" y="270" textAnchor="middle" className="fill-gray-300 text-sm font-medium">
          {props.name}
        </text>

        {/* Light status */}
        <g transform="translate(10, 20)">
          <circle cx="10" cy="10" r="8" fill={regularLight ? '#fbbf24' : '#374151'} />
          <text x="25" y="14" className="fill-gray-400 text-xs">Room Light</text>
          <circle cx="10" cy="35" r="8" fill={uvActive ? '#8b5cf6' : '#374151'} />
          <text x="25" y="39" className="fill-gray-400 text-xs">UV Light</text>
        </g>

        {/* Arrow marker */}
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#8b5cf6" />
          </marker>
        </defs>
      </svg>
    );
  };

  const renderTwistScene = (material: string, uvActive: boolean) => {
    const props = getMaterialProps(material);
    const isGlowing = uvActive && props.fluorescent;

    return (
      <svg viewBox="0 0 400 250" className="w-full h-48">
        <rect width="400" height="250" fill="#0a0a15" />

        {/* UV light */}
        {uvActive && (
          <rect x="0" y="0" width="400" height="250" fill="#1a0a2e" opacity="0.5" />
        )}

        {/* Four different materials side by side */}
        {['highlighter_yellow', 'highlighter_pink', 'highlighter_green', 'laundry_detergent'].map((mat, i) => {
          const matProps = getMaterialProps(mat);
          const selected = mat === material;
          const glowing = uvActive && matProps.fluorescent;

          return (
            <g key={mat} transform={`translate(${50 + i * 90}, 60)`}>
              {/* Glow */}
              {glowing && (
                <ellipse
                  cx="30"
                  cy="60"
                  rx={35 + Math.sin(animPhase + i) * 3}
                  ry={35 + Math.sin(animPhase + i) * 3}
                  fill={matProps.emitGlow}
                  opacity="0.3"
                />
              )}

              {/* Object */}
              <rect
                x="5"
                y="30"
                width="50"
                height="60"
                rx="4"
                fill={glowing ? matProps.emitColor : '#4b5563'}
                stroke={selected ? '#ffffff' : 'transparent'}
                strokeWidth="2"
                filter={glowing ? 'url(#glow)' : ''}
              />

              {/* Label */}
              <text x="30" y="120" textAnchor="middle" className="fill-gray-400 text-xs">
                {mat.includes('highlighter') ? mat.split('_')[1] : 'detergent'}
              </text>

              {/* Wavelength label when glowing */}
              {glowing && (
                <text x="30" y="15" textAnchor="middle" className="text-xs" style={{ fill: matProps.emitColor }}>
                  {mat === 'highlighter_yellow' ? '520nm' : mat === 'highlighter_pink' ? '580nm' : mat === 'highlighter_green' ? '510nm' : '440nm'}
                </text>
              )}
            </g>
          );
        })}

        {/* Explanation */}
        <text x="200" y="220" textAnchor="middle" className="fill-gray-300 text-sm">
          Same UV input → Different emission colors (Stokes shift varies)
        </text>

        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    );
  };

  const handlePrediction = useCallback((pred: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setPrediction(pred);
    playSound(pred === 'absorb' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((pred: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(pred);
    playSound(pred === 'different' ? 'success' : 'failure');
  }, [playSound]);

  const handleTestAnswer = useCallback((answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    const currentQuestion = testAnswers.length;
    const isCorrect = answerIndex === TEST_QUESTIONS[currentQuestion].correct;
    playSound(isCorrect ? 'success' : 'failure');
    setTestAnswers([...testAnswers, answerIndex]);
  }, [testAnswers, playSound]);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
  }, [playSound]);

  const calculateScore = () => testAnswers.filter((a, i) => a === TEST_QUESTIONS[i].correct).length;

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-violet-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-violet-100 to-fuchsia-200 bg-clip-text text-transparent">
        The Glowing Highlighter Mystery
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover how invisible light creates visible glow
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">🖍️🔦</div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              You&apos;ve seen highlighters glow bright under a blacklight at parties.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              But here&apos;s the mystery: <span className="text-fuchsia-400 font-semibold">UV light is invisible</span>, yet the highlighter
              glows <span className="text-green-400 font-semibold">visible green</span>!
            </p>
            <div className="pt-2">
              <p className="text-base text-violet-400 font-semibold">
                How does invisible light create visible glow?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToNextPhase(); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Investigate!
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-violet-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-violet-400">✦</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-violet-400">✦</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300">
          You shine an invisible UV light on a yellow highlighter. What will happen?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 max-w-lg w-full">
        {[
          { id: 'reflect', text: 'The UV bounces back as UV (still invisible)', icon: '↩️' },
          { id: 'absorb', text: 'The highlighter absorbs UV and re-emits VISIBLE light', icon: '✨' },
          { id: 'nothing', text: 'Nothing - UV passes right through transparent ink', icon: '➡️' },
          { id: 'heat', text: 'The highlighter heats up but doesn\'t glow', icon: '🔥' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={prediction !== null}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              prediction === option.id
                ? option.id === 'absorb' ? 'border-emerald-500 bg-emerald-900/30' : 'border-red-500 bg-red-900/30'
                : prediction !== null && option.id === 'absorb'
                  ? 'border-emerald-500 bg-emerald-900/30'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            {prediction === 'absorb' ? '✓ Correct!' : '✗ Not quite.'} Fluorescent molecules absorb UV and re-emit visible light!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToNextPhase(); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Experiment: UV Fluorescence</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        {renderFluorescenceScene(selectedMaterial, uvOn, regularLightOn)}
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-lg w-full mb-4">
        <div className="space-y-2">
          <label className="text-gray-400 text-sm">Material:</label>
          <select
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value as typeof selectedMaterial)}
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
          >
            <option value="highlighter">Yellow Highlighter</option>
            <option value="paper">Plain Paper</option>
            <option value="tonic">Tonic Water</option>
            <option value="mineral">Fluorite Crystal</option>
          </select>
        </div>

        <div className="space-y-3">
          <button
            onMouseDown={(e) => { e.preventDefault(); playSound('click'); setRegularLightOn(!regularLightOn); }}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
              regularLightOn
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            Room Light: {regularLightOn ? 'ON' : 'OFF'}
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); playSound('click'); setUvOn(!uvOn); }}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
              uvOn
                ? 'bg-violet-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            UV Light: {uvOn ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {uvOn && getMaterialProps(selectedMaterial).fluorescent && (
        <div className="bg-gradient-to-r from-violet-900/30 to-fuchsia-900/30 rounded-xl p-4 max-w-lg w-full mb-4">
          <p className="text-fuchsia-300 text-sm">
            <strong>Fluorescence!</strong> UV photons (short wavelength, high energy) are absorbed.
            The molecule re-emits light at a <em>longer wavelength</em> (lower energy) - visible!
          </p>
        </div>
      )}

      {uvOn && !getMaterialProps(selectedMaterial).fluorescent && (
        <div className="bg-gray-800/50 rounded-xl p-4 max-w-lg w-full mb-4">
          <p className="text-gray-400 text-sm">
            <strong>No fluorescence.</strong> This material lacks the special molecules
            that can absorb UV and re-emit visible light.
          </p>
        </div>
      )}

      <button
        onMouseDown={(e) => { e.preventDefault(); goToNextPhase(); }}
        className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
      >
        Continue →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">What&apos;s Really Happening</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg w-full mb-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold">1</div>
            <div>
              <h3 className="text-white font-semibold">UV Absorption</h3>
              <p className="text-gray-400 text-sm">High-energy UV photon excites electron to higher state</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-fuchsia-600 flex items-center justify-center text-white font-bold">2</div>
            <div>
              <h3 className="text-white font-semibold">Energy Loss</h3>
              <p className="text-gray-400 text-sm">Some energy lost as heat (vibrational relaxation)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">3</div>
            <div>
              <h3 className="text-white font-semibold">Visible Emission</h3>
              <p className="text-gray-400 text-sm">Lower-energy photon emitted - longer wavelength = visible!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-violet-900/30 rounded-xl p-4 max-w-lg w-full mb-6 text-center">
        <p className="text-violet-300 font-semibold">Stokes Shift</p>
        <p className="text-gray-400 text-sm mt-1">
          The wavelength difference between absorbed (UV ~365nm) and emitted (green ~520nm) light.
          Named after physicist George Stokes.
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-violet-400 font-semibold">{prediction === 'absorb' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={(e) => { e.preventDefault(); goToNextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
        >
          But wait... →
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-fuchsia-400 mb-6">🔄 The Twist!</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300">
          Different highlighter colors (yellow, pink, green) all absorb the <span className="text-violet-400">same UV light</span>.
          What color will they each glow?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 max-w-lg w-full">
        {[
          { id: 'same', text: 'They all glow the same color (UV is UV)', icon: '⚪' },
          { id: 'different', text: 'They each glow their own DIFFERENT visible color', icon: '🌈' },
          { id: 'white', text: 'They all glow white when fluorescent', icon: '⬜' },
          { id: 'none', text: 'Only yellow highlighters can fluoresce', icon: '🟡' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={twistPrediction !== null}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              twistPrediction === option.id
                ? option.id === 'different' ? 'border-emerald-500 bg-emerald-900/30' : 'border-red-500 bg-red-900/30'
                : twistPrediction !== null && option.id === 'different'
                  ? 'border-emerald-500 bg-emerald-900/30'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            {twistPrediction === 'different' ? '✓ Correct!' : '✗ Not quite.'} Each molecule has its own energy levels!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToNextPhase(); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-semibold rounded-xl"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-fuchsia-400 mb-4">Compare Fluorescent Materials</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        {renderTwistScene(twistMaterial, true)}
      </div>

      <div className="bg-gradient-to-r from-fuchsia-900/30 to-pink-900/30 rounded-xl p-4 max-w-lg w-full mb-4">
        <p className="text-fuchsia-300 text-sm text-center">
          <strong>Same UV in → Different colors out!</strong><br />
          Each molecule has its own energy levels, determining its emission wavelength.
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToNextPhase(); }}
        className="px-8 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-xl text-white font-semibold hover:from-fuchsia-500 hover:to-pink-500 transition-all"
      >
        Continue →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-fuchsia-400 mb-6">The Molecular Fingerprint</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg w-full mb-6">
        <p className="text-gray-300 text-center mb-4">
          Each fluorescent molecule has <span className="text-fuchsia-400 font-semibold">unique energy levels</span>.
          The Stokes shift varies by molecule!
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-green-400 font-semibold">Yellow Highlighter</div>
            <div className="text-gray-500">Emits ~520nm (green)</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-pink-400 font-semibold">Pink Highlighter</div>
            <div className="text-gray-500">Emits ~580nm (pink)</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-emerald-400 font-semibold">Green Highlighter</div>
            <div className="text-gray-500">Emits ~510nm (cyan-green)</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-blue-400 font-semibold">Laundry Detergent</div>
            <div className="text-gray-500">Emits ~440nm (blue)</div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-fuchsia-400 font-semibold">{twistPrediction === 'different' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={(e) => { e.preventDefault(); goToNextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-xl text-white font-semibold hover:from-fuchsia-500 hover:to-pink-500 transition-all"
        >
          See Applications →
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
      <p className="text-gray-400 mb-4">Tap each application to explore</p>

      <div className="grid grid-cols-2 gap-4 max-w-lg w-full mb-6">
        {TRANSFER_APPS.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(index); }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              completedApps.has(index)
                ? 'border-violet-500 bg-violet-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <div className="text-3xl mb-2">{app.icon}</div>
            <h3 className="text-white font-semibold text-sm">{app.title}</h3>
            <p className="text-gray-400 text-xs mt-1">{app.description}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">{TRANSFER_APPS.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-violet-500' : 'bg-slate-600'}`} />))}</div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>

      {completedApps.size >= 4 && (
        <button
          onMouseDown={(e) => { e.preventDefault(); goToNextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
        >
          Take the Quiz →
        </button>
      )}
    </div>
  );

  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const question = TEST_QUESTIONS[currentQuestion];

    if (!question || showTestResults) {
      const score = calculateScore();
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
          <div className="text-6xl mb-4">{score >= 3 ? '🎉' : '📚'}</div>
          <h2 className="text-2xl font-bold text-white mb-2">Quiz Complete!</h2>
          <p className="text-gray-300 mb-6">You got {score} out of {TEST_QUESTIONS.length} correct!</p>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              if (score >= 3) {
                playSound('complete');
                goToNextPhase();
              } else {
                setTestAnswers([]);
                setShowTestResults(false);
                goToPhase('review');
              }
            }}
            className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
          >
            {score >= 3 ? 'Complete! 🎊' : 'Review & Try Again'}
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-xl font-bold text-white mb-2">Quiz: Question {currentQuestion + 1}/{TEST_QUESTIONS.length}</h2>
        <p className="text-gray-300 text-center max-w-lg mb-6">{question.question}</p>

        <div className="grid grid-cols-1 gap-3 max-w-lg w-full">
          {question.options.map((option, i) => (
            <button
              key={i}
              onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(i); }}
              className="p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-violet-500 transition-all text-left text-gray-200"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-violet-900/50 via-fuchsia-900/50 to-pink-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🏆</div>
        <h1 className="text-3xl font-bold text-white mb-4">Fluorescence Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You&apos;ve mastered the physics of fluorescence!</p>
        <div className="bg-gradient-to-r from-violet-900/50 to-fuchsia-900/50 rounded-xl p-6 mb-6">
          <p className="text-violet-300 font-medium mb-4">You now understand:</p>
          <ul className="text-gray-300 text-sm space-y-2 text-left">
            <li>✓ UV absorption by fluorescent molecules</li>
            <li>✓ Re-emission at longer wavelength (Stokes shift)</li>
            <li>✓ Different molecules → different emission colors</li>
            <li>✓ Real-world applications from security to forensics</li>
          </ul>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          Next time you see a blacklight party, you&apos;ll know the physics of that glow!
        </p>
        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase('hook'); }}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl"
        >
          ↺ Explore Again
        </button>
      </div>
    </div>
  );

  // ─── Main Render ─────────────────────────────────────────────────────────────
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Fluorescence</span>
          <div className="flex items-center gap-1.5">
            {PHASE_ORDER.map((p, index) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-violet-400 w-6 shadow-lg shadow-violet-400/30'
                    : PHASE_ORDER.indexOf(phase) > index
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-violet-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default FluorescenceRenderer;
