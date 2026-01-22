'use client';

import React, { useState, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
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

interface GameEvent {
  type: 'prediction' | 'observation' | 'interaction' | 'completion';
  phase: Phase;
  data: Record<string, unknown>;
}

interface ViscoelasticityRendererProps {
  onEvent?: (event: GameEvent) => void;
  savedState?: GameState | null;
}

interface GameState {
  phase: Phase;
  prediction: string | null;
  twistPrediction: string | null;
  testAnswers: number[];
  completedApps: number[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const PHASES: Phase[] = [
  'hook', 'predict', 'play', 'review',
  'twist_predict', 'twist_play', 'twist_review',
  'transfer', 'test', 'mastery'
];

const TEST_QUESTIONS = [
  {
    question: 'Why does Silly Putty bounce when thrown but flow when left on a table?',
    options: [
      'It\'s made of two different materials',
      'Fast stress → elastic response; slow stress → viscous flow',
      'Temperature changes cause the different behaviors',
      'The rubber core is surrounded by oil'
    ],
    correct: 1
  },
  {
    question: 'What is the Deborah number?',
    options: [
      'The material\'s melting point',
      'Ratio of relaxation time to observation time - determines if material acts solid or liquid',
      'The number of polymer chains in the material',
      'Temperature at which flow begins'
    ],
    correct: 1
  },
  {
    question: 'Why do old cathedrals have thicker glass at the bottom of windows?',
    options: [
      'Craftsmen made them that way intentionally for stability',
      'Glass is viscoelastic and flows extremely slowly over centuries',
      'Heat from candles melted the bottom',
      'Gravity compressed the glass'
    ],
    correct: 1
  },
  {
    question: 'Which of these is NOT viscoelastic?',
    options: [
      'Silly Putty',
      'Honey',
      'Steel at room temperature',
      'Bread dough'
    ],
    correct: 2
  }
];

const TRANSFER_APPS = [
  {
    title: 'Memory Foam',
    description: 'Slowly conforms to your body shape, then rebounds when you get up. Viscoelastic!',
    icon: '🛏️'
  },
  {
    title: 'Earthquake Dampers',
    description: 'Viscoelastic materials in buildings absorb seismic energy through controlled flow.',
    icon: '🏢'
  },
  {
    title: 'Blood Flow',
    description: 'Blood is viscoelastic - it flows differently at different shear rates through vessels.',
    icon: '🩸'
  },
  {
    title: 'Polymer Processing',
    description: 'Injection molding must account for polymer viscoelasticity during cooling.',
    icon: '🏭'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function playSound(type: 'click' | 'success' | 'failure' | 'transition' | 'complete'): void {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const sounds: Record<string, { freq: number; type: OscillatorType; duration: number }> = {
      click: { freq: 600, type: 'sine', duration: 0.08 },
      success: { freq: 880, type: 'sine', duration: 0.15 },
      failure: { freq: 220, type: 'sine', duration: 0.25 },
      transition: { freq: 440, type: 'triangle', duration: 0.12 },
      complete: { freq: 660, type: 'sine', duration: 0.2 }
    };

    const sound = sounds[type];
    oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch {
    // Audio not available
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ViscoelasticityRenderer({ onEvent, savedState }: ViscoelasticityRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(savedState?.prediction || null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(savedState?.twistPrediction || null);
  const [testAnswers, setTestAnswers] = useState<number[]>(savedState?.testAnswers || []);
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );

  // Simulation state
  const [action, setAction] = useState<'none' | 'bounce' | 'flow' | 'pull'>('none');
  const [ballY, setBallY] = useState(100);
  const [ballVY, setBallVY] = useState(0);
  const [ballShape, setBallShape] = useState({ width: 60, height: 60 });
  const [flowProgress, setFlowProgress] = useState(0);
  const [pullLength, setPullLength] = useState(0);
  const [animPhase, setAnimPhase] = useState(0);

  // Twist state - glass flow
  const [glassAge, setGlassAge] = useState(0); // years
  const [isAging, setIsAging] = useState(false);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const emitEvent = (type: GameEvent['type'], data: Record<string, unknown> = {}) => {
    onEvent?.({ type, phase, data });
  };

  const goToPhase = (newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (navigationLockRef.current) return;

    lastClickRef.current = now;
    navigationLockRef.current = true;

    playSound('transition');
    setPhase(newPhase);
    emitEvent('interaction', { action: 'phase_change', from: phase, to: newPhase });

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  };

  const nextPhase = () => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex < PHASES.length - 1) {
      goToPhase(PHASES[currentIndex + 1]);
    }
  };

  // ─── Animation Effects ───────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 0.05) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Bounce animation
  useEffect(() => {
    if (action !== 'bounce') return;

    const interval = setInterval(() => {
      setBallVY(vy => vy + 1); // gravity
      setBallY(y => {
        const newY = y + ballVY;
        if (newY > 180) {
          // Bounce! (elastic response)
          setBallVY(-ballVY * 0.8);
          setBallShape({ width: 80, height: 40 }); // squish
          setTimeout(() => setBallShape({ width: 60, height: 60 }), 100);
          return 180;
        }
        return newY;
      });

      // Stop after a few bounces
      if (Math.abs(ballVY) < 1 && ballY > 175) {
        setAction('none');
        setBallY(180);
        setBallVY(0);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [action, ballVY, ballY]);

  // Flow animation
  useEffect(() => {
    if (action !== 'flow') return;

    const interval = setInterval(() => {
      setFlowProgress(p => {
        if (p >= 1) {
          setAction('none');
          return 1;
        }
        return p + 0.01;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [action]);

  // Pull animation
  useEffect(() => {
    if (action !== 'pull') return;

    const interval = setInterval(() => {
      setPullLength(l => {
        if (l >= 100) {
          setAction('none');
          return 100;
        }
        return l + 2;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [action]);

  // Glass aging simulation
  useEffect(() => {
    if (!isAging) return;

    const interval = setInterval(() => {
      setGlassAge(a => {
        if (a >= 500) {
          setIsAging(false);
          return 500;
        }
        return a + 10;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isAging]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setAction('none');
      setBallY(100);
      setBallVY(0);
      setBallShape({ width: 60, height: 60 });
      setFlowProgress(0);
      setPullLength(0);
    }
    if (phase === 'twist_play') {
      setGlassAge(0);
      setIsAging(false);
    }
  }, [phase]);

  // ─── Render Helpers ──────────────────────────────────────────────────────────
  const renderProgressBar = () => (
    <div className="flex items-center gap-1 mb-6">
      {PHASES.map((p, i) => (
        <div
          key={p}
          className={`h-2 flex-1 rounded-full transition-all duration-300 ${
            i <= PHASES.indexOf(phase)
              ? 'bg-gradient-to-r from-pink-500 to-purple-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  const renderPuttyScene = () => {
    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#1f2937" />

        {/* Floor */}
        <rect x="0" y="200" width="400" height="80" fill="#374151" />
        <line x1="0" y1="200" x2="400" y2="200" stroke="#4b5563" strokeWidth="2" />

        {/* Bounce demo */}
        <g transform="translate(70, 0)">
          <text x="30" y="30" textAnchor="middle" className="fill-gray-400 text-xs font-semibold">
            Fast Impact
          </text>

          {action === 'bounce' ? (
            <ellipse
              cx={30}
              cy={ballY}
              rx={ballShape.width / 2}
              ry={ballShape.height / 2}
              fill="#ec4899"
            />
          ) : (
            <ellipse cx={30} cy={ballY} rx={30} ry={30} fill="#ec4899" />
          )}

          {/* Bounce arrow */}
          {action === 'none' && (
            <g className="animate-pulse">
              <line x1="30" y1="70" x2="30" y2="50" stroke="#22c55e" strokeWidth="2" />
              <polygon points="25,55 30,45 35,55" fill="#22c55e" />
              <text x="30" y="40" textAnchor="middle" className="fill-green-400 text-xs">Drop!</text>
            </g>
          )}

          {/* Result label */}
          <text x="30" y="230" textAnchor="middle" className="fill-pink-400 text-xs">
            {action === 'bounce' ? 'BOUNCING!' : 'Elastic response'}
          </text>
        </g>

        {/* Flow demo */}
        <g transform="translate(200, 0)">
          <text x="30" y="30" textAnchor="middle" className="fill-gray-400 text-xs font-semibold">
            Slow Stress
          </text>

          {/* Putty blob that flows */}
          <ellipse
            cx={30}
            cy={150}
            rx={30 + flowProgress * 40}
            ry={30 - flowProgress * 20}
            fill="#ec4899"
          />

          {/* Time indicator */}
          {action === 'flow' && (
            <text x="30" y="230" textAnchor="middle" className="fill-purple-400 text-xs">
              Flowing... {(flowProgress * 60).toFixed(0)}s
            </text>
          )}
          {action !== 'flow' && flowProgress > 0 && (
            <text x="30" y="230" textAnchor="middle" className="fill-purple-400 text-xs">
              Viscous flow!
            </text>
          )}
          {action !== 'flow' && flowProgress === 0 && (
            <text x="30" y="230" textAnchor="middle" className="fill-gray-500 text-xs">
              Wait and watch...
            </text>
          )}
        </g>

        {/* Pull demo */}
        <g transform="translate(330, 0)">
          <text x="30" y="30" textAnchor="middle" className="fill-gray-400 text-xs font-semibold">
            Quick Pull
          </text>

          {/* Putty being pulled */}
          <ellipse
            cx={30}
            cy={150 - pullLength / 2}
            rx={Math.max(10, 30 - pullLength / 4)}
            ry={30 + pullLength / 2}
            fill="#ec4899"
          />

          {/* Breaking point */}
          {pullLength > 80 && (
            <g>
              <text x="30" y="80" textAnchor="middle" className="fill-red-400 text-xs font-bold">
                SNAP!
              </text>
              <ellipse cx={30} cy={60} rx={15} ry={15} fill="#ec4899" />
            </g>
          )}

          <text x="30" y="230" textAnchor="middle" className="fill-pink-400 text-xs">
            {pullLength > 80 ? 'Broke like solid!' : pullLength > 0 ? 'Stretching...' : 'Quick stretch'}
          </text>
        </g>

        {/* Deborah number diagram */}
        <g transform="translate(100, 250)">
          <text x="100" y="0" textAnchor="middle" className="fill-gray-400 text-xs">
            De = τ / t : relaxation time / observation time
          </text>
          <text x="100" y="15" textAnchor="middle" className="fill-gray-500 text-xs">
            High De → solid-like | Low De → liquid-like
          </text>
        </g>
      </svg>
    );
  };

  const renderGlassScene = () => {
    const flowAmount = Math.min(glassAge / 500, 1);
    const topThickness = 20 - flowAmount * 8;
    const bottomThickness = 20 + flowAmount * 15;

    return (
      <svg viewBox="0 0 400 250" className="w-full h-48">
        <rect width="400" height="250" fill="#1a1a2e" />

        {/* Cathedral window frame */}
        <g transform="translate(100, 30)">
          {/* Stone frame */}
          <path
            d="M 0 180 L 0 50 Q 100 0 200 50 L 200 180 Z"
            fill="#4a4a4a"
            stroke="#5a5a5a"
            strokeWidth="3"
          />

          {/* Glass pane with variable thickness */}
          <g>
            {/* Glass sections showing flow */}
            {[...Array(6)].map((_, i) => {
              const yPos = 50 + i * 22;
              const thickness = topThickness + (bottomThickness - topThickness) * (i / 5);
              return (
                <rect
                  key={i}
                  x={20 + (20 - thickness) / 2}
                  y={yPos}
                  width={160 - (20 - thickness)}
                  height={20}
                  fill="#88c0d0"
                  opacity={0.7 - i * 0.05}
                />
              );
            })}

            {/* Thickness labels */}
            <text x="220" y="60" className="fill-cyan-400 text-xs">
              Top: {topThickness.toFixed(1)}mm
            </text>
            <text x="220" y="165" className="fill-cyan-400 text-xs">
              Bottom: {bottomThickness.toFixed(1)}mm
            </text>

            {/* Flow arrows */}
            {flowAmount > 0.2 && (
              <g className="animate-pulse">
                <line x1="100" y1="80" x2="100" y2="150" stroke="#ef4444" strokeWidth="2" strokeDasharray="5,3" />
                <polygon points="95,145 100,155 105,145" fill="#ef4444" />
              </g>
            )}
          </g>

          {/* Gothic arch detail */}
          <path
            d="M 20 50 Q 100 20 180 50"
            fill="none"
            stroke="#3a3a3a"
            strokeWidth="5"
          />
        </g>

        {/* Time display */}
        <g transform="translate(20, 210)">
          <text x="0" y="0" className="fill-gray-300 text-sm font-semibold">
            Time: {glassAge} years
          </text>
          <text x="0" y="18" className="fill-gray-500 text-xs">
            {glassAge === 0 ? 'Brand new glass' :
              glassAge < 200 ? 'Some settling...' :
                glassAge < 400 ? 'Noticeable flow!' :
                  'Significant deformation!'}
          </text>
        </g>

        {/* Explanation */}
        <text x="320" y="230" textAnchor="middle" className="fill-purple-400 text-xs">
          Glass: Very high viscosity,
        </text>
        <text x="320" y="245" textAnchor="middle" className="fill-purple-400 text-xs">
          but it still flows!
        </text>
      </svg>
    );
  };

  // ─── Phase Labels ───────────────────────────────────────────────────────────
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

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-pink-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-pink-100 to-purple-200 bg-clip-text text-transparent">
        The Silly Putty Paradox
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Is it a solid or a liquid? The answer depends on when you look!
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-purple-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">🔮💧</div>
          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Silly Putty <span className="text-pink-400">bounces like rubber</span> when thrown,
              but <span className="text-purple-400">flows like honey</span> when left on a table.
            </p>
            <div className="pt-2">
              <p className="text-base text-pink-400 font-semibold">
                How can the same material behave as both?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); nextPhase(); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Investigate
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-pink-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-pink-400">✦</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-pink-400">✦</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Make Your Prediction</h2>
      <p className="text-gray-300 text-center">
        You drop Silly Putty on the floor (fast impact). What happens?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'bounce', text: 'It bounces! Fast stress → elastic (solid-like) response', icon: '⬆️' },
          { id: 'splat', text: 'It splats flat and stays there', icon: '💧' },
          { id: 'shatter', text: 'It shatters into pieces like glass', icon: '💥' },
          { id: 'nothing', text: 'It just sits there, slightly deformed', icon: '⚪' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => {
              playSound('click');
              setPrediction(option.id);
              emitEvent('prediction', { prediction: option.id });
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              prediction === option.id
                ? 'border-pink-500 bg-pink-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <div className="text-center">
          <button
            onMouseDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl text-white font-semibold hover:from-pink-500 hover:to-purple-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Viscoelastic Materials</h2>

      {renderPuttyScene()}

      <div className="flex flex-wrap justify-center gap-3">
        <button
          onMouseDown={() => {
            playSound('click');
            setAction('bounce');
            setBallY(50);
            setBallVY(0);
          }}
          disabled={action !== 'none'}
          className="px-4 py-2 rounded-lg font-medium bg-pink-600 text-white hover:bg-pink-500 disabled:bg-gray-600 transition-all"
        >
          🎾 Drop (Fast)
        </button>
        <button
          onMouseDown={() => {
            playSound('click');
            setAction('flow');
            setFlowProgress(0);
          }}
          disabled={action !== 'none'}
          className="px-4 py-2 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-500 disabled:bg-gray-600 transition-all"
        >
          ⏰ Wait (Slow)
        </button>
        <button
          onMouseDown={() => {
            playSound('click');
            setAction('pull');
            setPullLength(0);
          }}
          disabled={action !== 'none'}
          className="px-4 py-2 rounded-lg font-medium bg-fuchsia-600 text-white hover:bg-fuchsia-500 disabled:bg-gray-600 transition-all"
        >
          🤏 Pull (Quick)
        </button>
      </div>

      <div className="bg-gradient-to-r from-pink-900/30 to-purple-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-pink-300 text-sm text-center">
          <strong>Viscoelastic materials</strong> have both viscous (liquid) and elastic (solid) properties.
          The response depends on the <em>timescale</em> of the applied stress!
        </p>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl text-white font-semibold hover:from-pink-500 hover:to-purple-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">The Deborah Number</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold">De</div>
            <div>
              <h3 className="text-white font-semibold">Deborah Number = τ / t</h3>
              <p className="text-gray-400 text-sm">Relaxation time (τ) ÷ Observation time (t)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">Hi</div>
            <div>
              <h3 className="text-white font-semibold">High De (fast events)</h3>
              <p className="text-gray-400 text-sm">Material can&apos;t relax in time → behaves like solid</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-fuchsia-600 flex items-center justify-center text-white font-bold">Lo</div>
            <div>
              <h3 className="text-white font-semibold">Low De (slow events)</h3>
              <p className="text-gray-400 text-sm">Material has time to flow → behaves like liquid</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-pink-900/30 rounded-xl p-4 max-w-lg mx-auto text-center">
        <p className="text-pink-300 font-semibold">&quot;Everything flows if you wait long enough&quot;</p>
        <p className="text-gray-400 text-sm mt-1">
          - Heraclitus (paraphrased). Named after the prophetess Deborah
          who said &quot;The mountains flowed before the Lord.&quot;
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-pink-400 font-semibold">{prediction === 'bounce' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl text-white font-semibold hover:from-pink-500 hover:to-purple-500 transition-all"
        >
          But wait... →
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">🔄 The Twist!</h2>
      <p className="text-gray-300 text-center max-w-lg mx-auto">
        Old cathedral windows are often <span className="text-cyan-400 font-semibold">thicker at the bottom</span> than the top.
        Some say it&apos;s because glass flows over centuries. Is glass a very slow liquid?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'flows', text: 'Yes! Glass is viscoelastic with extremely high viscosity', icon: '💧' },
          { id: 'solid', text: 'No, glass is a true solid - it never flows', icon: '🧊' },
          { id: 'defect', text: 'Old manufacturing made uneven glass that was installed thick-side-down', icon: '🏭' },
          { id: 'heat', text: 'Centuries of sunlight melted the glass', icon: '☀️' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => {
              playSound('click');
              setTwistPrediction(option.id);
              emitEvent('prediction', { twistPrediction: option.id });
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              twistPrediction === option.id
                ? 'border-purple-500 bg-purple-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div className="text-center">
          <button
            onMouseDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-semibold hover:from-purple-500 hover:to-indigo-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Does Glass Flow?</h2>

      {renderGlassScene()}

      <div className="flex justify-center gap-4">
        <button
          onMouseDown={() => {
            playSound('click');
            setIsAging(true);
            setGlassAge(0);
          }}
          disabled={isAging}
          className="px-6 py-2 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-500 disabled:bg-gray-600 transition-all"
        >
          {isAging ? '⏳ Aging...' : '🕰️ Age 500 Years'}
        </button>
        <button
          onMouseDown={() => {
            playSound('click');
            setGlassAge(0);
            setIsAging(false);
          }}
          className="px-6 py-2 rounded-lg font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-all"
        >
          🔄 Reset
        </button>
      </div>

      <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-purple-300 text-sm text-center">
          <strong>Plot twist:</strong> While glass IS technically viscoelastic, its viscosity is so astronomically high
          (~10²⁰ Pa·s) that measurable flow would take longer than the age of the universe!
          The thick bottoms are from old manufacturing, not flow.
        </p>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-semibold hover:from-purple-500 hover:to-indigo-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">The Glass Myth</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-center mb-4">
          Both answers have truth!
        </p>

        <div className="space-y-3 text-sm">
          <div className="bg-cyan-900/30 rounded-lg p-3">
            <div className="text-cyan-400 font-semibold">✓ Glass IS viscoelastic</div>
            <div className="text-gray-500">It has a finite (but enormous) viscosity</div>
          </div>
          <div className="bg-yellow-900/30 rounded-lg p-3">
            <div className="text-yellow-400 font-semibold">✓ Cathedral windows ≠ flow</div>
            <div className="text-gray-500">Old crown glass was uneven; installed thick-side-down for stability</div>
          </div>
          <div className="bg-pink-900/30 rounded-lg p-3">
            <div className="text-pink-400 font-semibold">✓ Timescale matters!</div>
            <div className="text-gray-500">Glass would need billions of years to flow noticeably at room temp</div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">
          Both &quot;flows&quot; and &quot;defect&quot; are partially correct!
        </p>
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-semibold hover:from-purple-500 hover:to-indigo-500 transition-all"
        >
          See Applications →
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Real-World Applications</h2>
      <p className="text-gray-400 text-center">Tap each application to explore</p>

      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
        {TRANSFER_APPS.map((app, index) => (
          <button
            key={index}
            onMouseDown={() => {
              playSound('click');
              setCompletedApps(prev => new Set([...prev, index]));
              emitEvent('interaction', { app: app.title });
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              completedApps.has(index)
                ? 'border-pink-500 bg-pink-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <div className="text-3xl mb-2">{app.icon}</div>
            <h3 className="text-white font-semibold text-sm">{app.title}</h3>
            <p className="text-gray-400 text-xs mt-1">{app.description}</p>
          </button>
        ))}
      </div>

      {completedApps.size >= 4 && (
        <div className="text-center">
          <button
            onMouseDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl text-white font-semibold hover:from-pink-500 hover:to-purple-500 transition-all"
          >
            Take the Quiz →
          </button>
        </div>
      )}
    </div>
  );

  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const question = TEST_QUESTIONS[currentQuestion];

    if (!question) {
      const score = testAnswers.filter((a, i) => a === TEST_QUESTIONS[i].correct).length;
      return (
        <div className="text-center space-y-6">
          <div className="text-6xl">{score >= 3 ? '🎉' : '📚'}</div>
          <h2 className="text-2xl font-bold text-white">Quiz Complete!</h2>
          <p className="text-gray-300">You got {score} out of {TEST_QUESTIONS.length} correct!</p>
          <button
            onMouseDown={() => {
              playSound(score >= 3 ? 'complete' : 'click');
              nextPhase();
            }}
            className="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl text-white font-semibold hover:from-pink-500 hover:to-purple-500 transition-all"
          >
            {score >= 3 ? 'Complete! 🎊' : 'Continue →'}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white text-center">Quiz: Question {currentQuestion + 1}/{TEST_QUESTIONS.length}</h2>
        <p className="text-gray-300 text-center max-w-lg mx-auto">{question.question}</p>

        <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
          {question.options.map((option, i) => (
            <button
              key={i}
              onMouseDown={() => {
                playSound(i === question.correct ? 'success' : 'failure');
                setTestAnswers([...testAnswers, i]);
                emitEvent('interaction', { question: currentQuestion, answer: i, correct: i === question.correct });
              }}
              className="p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-pink-500 transition-all text-left text-gray-200"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl">🏆</div>
      <h2 className="text-2xl font-bold text-white">Viscoelasticity Master!</h2>
      <div className="bg-gradient-to-r from-pink-900/50 to-purple-900/50 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-pink-300 font-medium mb-4">You now understand:</p>
        <ul className="text-gray-300 text-sm space-y-2 text-left">
          <li>✓ Viscoelastic = both viscous AND elastic properties</li>
          <li>✓ Deborah number determines solid vs liquid behavior</li>
          <li>✓ Fast stress → elastic; slow stress → viscous</li>
          <li>✓ Glass myth: technically flows but way too slowly to measure</li>
        </ul>
      </div>
      <p className="text-gray-400 text-sm">
        Next time you play with Silly Putty, you&apos;ll see physics in action! 🔮
      </p>
      <button
        onMouseDown={() => {
          playSound('complete');
          emitEvent('completion', { mastered: true });
        }}
        className="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl text-white font-semibold hover:from-pink-500 hover:to-purple-500 transition-all"
      >
        Complete! 🎊
      </button>
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
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Viscoelasticity</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-pink-400 w-6 shadow-lg shadow-pink-400/30'
                    : PHASES.indexOf(phase) > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-pink-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12 max-w-4xl mx-auto">{renderPhase()}</div>
    </div>
  );
}
