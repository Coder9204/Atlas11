import React, { useState, useRef, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────
// WaterHammerRenderer – Teach pressure surge when flow suddenly stops
// ─────────────────────────────────────────────────────────────
// Physics: ΔP = ρ × c × Δv (Joukowsky equation)
// Water hammer occurs when fluid momentum is suddenly arrested
// Pressure wave travels at speed of sound in fluid (~1400 m/s for water)

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

interface WaterHammerRendererProps {
  onGameEvent?: (event: GameEvent) => void;
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
  'hook',
  'predict',
  'play',
  'review',
  'twist_predict',
  'twist_play',
  'twist_review',
  'transfer',
  'test',
  'mastery',
];

function isValidPhase(p: string): p is Phase {
  return phaseOrder.includes(p as Phase);
}

const playSound = (frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {}
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function WaterHammerRenderer({ onGameEvent }: WaterHammerRendererProps) {
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [testAnswers, setTestAnswers] = useState<Record<number, number>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [valveOpen, setValveOpen] = useState(true);
  const [flowVelocity, setFlowVelocity] = useState(3); // m/s
  const [pipeLength, setPipeLength] = useState(100); // meters
  const [pressureWave, setPressureWave] = useState<number[]>([]);
  const [wavePosition, setWavePosition] = useState(0);
  const [maxPressure, setMaxPressure] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [hasClosedValve, setHasClosedValve] = useState(false);

  // Twist: compare fast vs slow valve closure
  const [closureTime, setClosureTime] = useState(0.01); // seconds
  const [twistAnimating, setTwistAnimating] = useState(false);
  const [twistPressureHistory, setTwistPressureHistory] = useState<number[]>([]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const goToPhase = (newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (navigationLockRef.current) return;

    lastClickRef.current = now;
    navigationLockRef.current = true;
    setTimeout(() => { navigationLockRef.current = false; }, 400);

    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', from: phase, to: newPhase });
    }
    setPhase(newPhase);
    playSound('transition');
  };

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

  // Constants for water
  const waterDensity = 1000; // kg/m³
  const soundSpeed = 1400; // m/s in water

  // Joukowsky equation: ΔP = ρ × c × Δv
  const calculatePressureRise = (velocity: number) => {
    return waterDensity * soundSpeed * velocity; // Pascals
  };

  // Convert to bars (1 bar = 100,000 Pa)
  const pressureInBars = (pa: number) => pa / 100000;

  // Simulate valve closure
  const closeValve = () => {
    if (animating) return;
    setAnimating(true);
    setValveOpen(false);
    setHasClosedValve(true);

    const peakPressure = calculatePressureRise(flowVelocity);
    setMaxPressure(peakPressure);

    // Generate pressure wave
    const steps = 60;
    const wave: number[] = [];

    // Pressure rises sharply, then oscillates and decays
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const damping = Math.exp(-t * 3);
      const oscillation = Math.cos(t * Math.PI * 6);
      wave.push(peakPressure * damping * oscillation);
    }

    setPressureWave(wave);

    // Animate wave position
    let pos = 0;
    const interval = setInterval(() => {
      pos += 2;
      setWavePosition(pos);

      if (pos >= 100) {
        clearInterval(interval);
        setAnimating(false);
      }
    }, 50);

    // Sound effect - loud bang!
    playSound('click');
    setTimeout(() => playSound('click'), 100);
  };

  const resetSimulation = () => {
    setValveOpen(true);
    setPressureWave([]);
    setWavePosition(0);
    setMaxPressure(0);
    setAnimating(false);
    setHasClosedValve(false);
  };

  // Twist simulation - slow closure
  const simulateSlowClosure = () => {
    if (twistAnimating) return;
    setTwistAnimating(true);
    setTwistPressureHistory([]);

    const steps = 100;
    const history: number[] = [];

    // Critical time = 2L/c (time for wave to travel pipe and back)
    const criticalTime = (2 * pipeLength) / soundSpeed;

    // If closure time > critical time, pressure is reduced
    const effectiveVelocityChange = closureTime < criticalTime
      ? flowVelocity
      : flowVelocity * (criticalTime / closureTime);

    const peakPressure = calculatePressureRise(effectiveVelocityChange);

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const riseTime = Math.min(closureTime / criticalTime, 1);

      if (t < riseTime) {
        history.push(peakPressure * (t / riseTime));
      } else {
        const decay = Math.exp(-(t - riseTime) * 5);
        const oscillation = Math.cos((t - riseTime) * Math.PI * 8) * 0.3 + 0.7;
        history.push(peakPressure * decay * oscillation);
      }
    }

    let i = 0;
    const interval = setInterval(() => {
      setTwistPressureHistory(history.slice(0, i));
      i += 2;
      if (i > steps) {
        clearInterval(interval);
        setTwistAnimating(false);
      }
    }, 30);
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
    playSound(score >= 7 ? 523 : 330, 0.3, 'sine', 0.3);
  };

  const testQuestions = [
    {
      q: "What is water hammer?",
      options: [
        "A tool for plumbing",
        "A pressure surge when flow suddenly stops",
        "Water freezing in pipes",
        "A type of water pump"
      ],
      correct: 1,
      explanation: "Water hammer is the pressure surge caused when fluid in motion is suddenly stopped or redirected, creating a shockwave in the pipe."
    },
    {
      q: "What causes the loud bang in pipes when you quickly close a faucet?",
      options: [
        "Air bubbles collapsing",
        "Pipe expansion",
        "Kinetic energy converting to pressure energy",
        "Vibrating water molecules"
      ],
      correct: 2,
      explanation: "The flowing water's kinetic energy converts to pressure energy when suddenly stopped, creating a pressure wave that makes pipes vibrate and bang."
    },
    {
      q: "According to the Joukowsky equation, what happens if you double the water velocity?",
      options: [
        "Pressure rise halves",
        "Pressure rise doubles",
        "Pressure rise quadruples",
        "No change in pressure"
      ],
      correct: 1,
      explanation: "The Joukowsky equation (ΔP = ρcΔv) shows pressure rise is directly proportional to velocity change - double velocity means double pressure."
    },
    {
      q: "At what speed does the pressure wave travel in water pipes?",
      options: [
        "Speed of the water flow",
        "Speed of sound in water (~1400 m/s)",
        "Speed of light",
        "Much slower than water flow"
      ],
      correct: 1,
      explanation: "The pressure wave travels at the speed of sound in the fluid, which is about 1400 m/s for water in pipes."
    },
    {
      q: "What is the critical time (Tc) in water hammer analysis?",
      options: [
        "Time before pipe bursts",
        "Time for wave to travel pipe length and back",
        "Time to close the valve",
        "Time for water to stop flowing"
      ],
      correct: 1,
      explanation: "Critical time Tc = 2L/c is the time for the pressure wave to travel the pipe length and reflect back. It determines if closure is 'fast' or 'slow'."
    },
    {
      q: "How can water hammer damage be reduced?",
      options: [
        "Using smaller pipes",
        "Increasing water pressure",
        "Closing valves slowly",
        "Using hotter water"
      ],
      correct: 2,
      explanation: "Closing valves slowly over a time greater than the critical time allows the pressure wave to dissipate gradually, reducing peak pressure."
    },
    {
      q: "What is a water hammer arrestor?",
      options: [
        "A device that stops water flow",
        "A cushioning device with air or gas",
        "A type of water filter",
        "A pipe insulation"
      ],
      correct: 1,
      explanation: "Water hammer arrestors contain a compressible cushion (air or gas) that absorbs the shock wave, preventing pipe damage and noise."
    },
    {
      q: "Why is water hammer worse in long pipes?",
      options: [
        "More water means more momentum",
        "Pipes are weaker when longer",
        "Sound travels slower in long pipes",
        "Long pipes have more friction"
      ],
      correct: 0,
      explanation: "Longer pipes contain more water in motion, meaning more total momentum that converts to pressure when flow is stopped."
    },
    {
      q: "In the Joukowsky equation ΔP = ρcΔv, what does 'c' represent?",
      options: [
        "Water temperature",
        "Pipe circumference",
        "Speed of sound in fluid",
        "Closure time"
      ],
      correct: 2,
      explanation: "In the Joukowsky equation, 'c' is the speed of sound in the fluid (about 1400 m/s for water), which determines wave propagation speed."
    },
    {
      q: "What pressure rise occurs when water flowing at 3 m/s suddenly stops? (ρ=1000 kg/m³, c=1400 m/s)",
      options: [
        "4,200 Pa",
        "42,000 Pa",
        "420,000 Pa",
        "4,200,000 Pa"
      ],
      correct: 3,
      explanation: "Using ΔP = ρcΔv = 1000 × 1400 × 3 = 4,200,000 Pa ≈ 42 bar. This is why water hammer can burst pipes!"
    }
  ];

  const applications = [
    {
      title: "Household Plumbing",
      description: "Banging pipes when faucets close quickly",
      detail: "The annoying banging in home pipes is water hammer. Hammer arrestors are installed near washing machines and dishwashers to absorb shocks.",
      icon: "🚰"
    },
    {
      title: "Hydroelectric Dams",
      description: "Emergency valve closure protection",
      detail: "Surge tanks and slow-closing valves protect turbines. The Hoover Dam uses massive surge chambers to handle 500+ m³/s flow changes.",
      icon: "🏭"
    },
    {
      title: "Heart & Blood Vessels",
      description: "Aortic valve closure creates pulse",
      detail: "The 'lub-dub' heartbeat partially comes from valve closure. The dicrotic notch in pulse waves is a mini water hammer from aortic valve closing.",
      icon: "❤️"
    },
    {
      title: "Oil & Gas Pipelines",
      description: "Pump shutdown protection",
      detail: "Thousand-kilometer pipelines need careful transient analysis. The Alaska Pipeline uses multiple surge control systems to prevent catastrophic pressure waves.",
      icon: "⛽"
    }
  ];

  const renderPhase = () => {
    switch (phase) {
      // ───────────────────────────────────────────────────
      // HOOK - Premium Design
      // ───────────────────────────────────────────────────
      case 'hook':
        return (
          <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
            {/* Premium badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-8">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-blue-400 tracking-wide">PHYSICS EXPLORATION</span>
            </div>

            {/* Main title with gradient */}
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">
              The Pipe Destroyer
            </h1>

            <p className="text-lg text-slate-400 max-w-md mb-10">
              Have you heard pipes BANG when someone quickly shuts off a faucet?
            </p>

            {/* Premium card with graphic */}
            <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
              {/* Subtle glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 rounded-3xl" />

              <div className="relative">
                <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: 400, margin: '0 auto', display: 'block' }}>
                  <rect x="50" y="70" width="300" height="60" fill="#334155" stroke="#475569" strokeWidth="3" rx="5" />
                  <rect x="50" y="80" width="300" height="40" fill="#475569" />
                  <g>
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <circle key={i} cx={80 + i * 45} cy="100" r="10" fill="#3b82f6" opacity="0.8">
                        <animate attributeName="cx" values={`${80 + i * 45};${125 + i * 45}`} dur="0.5s" repeatCount="indefinite" />
                      </circle>
                    ))}
                  </g>
                  <rect x="330" y="50" width="20" height="100" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" rx="3" />
                  <rect x="320" y="40" width="40" height="15" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" rx="3" />
                  <text x="200" y="170" textAnchor="middle" fill="#f87171" fontSize="14" fontWeight="bold">💥 BANG! 💥</text>
                </svg>

                <div className="mt-6 space-y-4">
                  <p className="text-xl text-white/90 font-medium leading-relaxed">
                    This &quot;water hammer&quot; can generate pressures over 40 bar!
                  </p>
                  <div className="pt-2">
                    <p className="text-base text-blue-400 font-semibold">
                      Enough to burst pipes and damage equipment.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium CTA button */}
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase('predict'); }}
              className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center gap-3">
                Investigate the Pressure Wave
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>

            {/* Feature hints */}
            <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <span className="text-blue-400">✦</span>
                Interactive Lab
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-400">✦</span>
                Real-World Examples
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-400">✦</span>
                Knowledge Test
              </div>
            </div>
          </div>
        );

      // ───────────────────────────────────────────────────
      // PREDICT
      // ───────────────────────────────────────────────────
      case 'predict':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              Make Your Prediction
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500 }}>
              Water is flowing through a pipe at 3 m/s. If you instantly close a valve,
              what happens to the pressure at the valve?
            </p>

            <svg viewBox="0 0 400 150" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              {/* Pipe diagram */}
              <rect x="30" y="50" width="340" height="50" fill="#64748b" stroke="#475569" strokeWidth="2" rx="5" />

              {/* Water */}
              <rect x="35" y="55" width="290" height="40" fill="#3b82f6" opacity="0.5" />

              {/* Flow arrows */}
              {[0, 1, 2, 3].map(i => (
                <path
                  key={i}
                  d={`M${80 + i * 60},75 L${110 + i * 60},75 L${105 + i * 60},65 M${110 + i * 60},75 L${105 + i * 60},85`}
                  fill="none"
                  stroke="#1d4ed8"
                  strokeWidth="3"
                />
              ))}

              {/* Valve */}
              <rect x="330" y="40" width="30" height="70" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
              <text x="345" y="80" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">VALVE</text>

              {/* Labels */}
              <text x="200" y="35" textAnchor="middle" fill="#1e293b" fontSize="12" fontWeight="bold">
                Water flowing at 3 m/s →
              </text>
              <text x="200" y="130" textAnchor="middle" fill="#dc2626" fontSize="12">
                Valve closes instantly!
              </text>
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
              {[
                { id: 'a', text: 'Pressure drops as water slows down' },
                { id: 'b', text: 'Pressure stays the same' },
                { id: 'c', text: 'Pressure rises dramatically' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={() => handlePrediction(opt.id)}
                  style={{
                    padding: '1rem',
                    background: prediction === opt.id ? '#3b82f6' : 'white',
                    color: prediction === opt.id ? 'white' : '#1e293b',
                    border: `2px solid ${prediction === opt.id ? '#3b82f6' : '#e2e8f0'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s'
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            {prediction && (
              <button
                onMouseDown={() => goToPhase('play')}
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Test It!
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // PLAY
      // ───────────────────────────────────────────────────
      case 'play':
        const currentPressure = pressureWave.length > 0
          ? pressureWave[Math.min(Math.floor(wavePosition / 100 * pressureWave.length), pressureWave.length - 1)]
          : 0;

        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Water Hammer Simulator
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>
              Close the valve to see what happens!
            </p>

            <svg viewBox="0 0 400 280" style={{ width: '100%', maxWidth: 450, marginBottom: '1rem' }}>
              {/* Pipe system */}
              <rect x="20" y="80" width="300" height="50" fill="#475569" stroke="#1e293b" strokeWidth="2" rx="3" />
              <rect x="25" y="85" width="290" height="40" fill={valveOpen ? '#3b82f6' : '#1e40af'} opacity="0.6" />

              {/* Pressure wave visualization */}
              {!valveOpen && wavePosition > 0 && (
                <g>
                  {/* Shock wave moving backward */}
                  <rect
                    x={315 - wavePosition * 2.9}
                    y="85"
                    width="20"
                    height="40"
                    fill="#ef4444"
                    opacity={0.8 - wavePosition / 200}
                  />
                  {/* Pressure colors */}
                  <defs>
                    <linearGradient id="pressureGrad" x1="100%" y1="0%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset={`${wavePosition}%`} stopColor="#ef4444" />
                      <stop offset={`${wavePosition + 5}%`} stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                  <rect x="25" y="85" width="290" height="40" fill="url(#pressureGrad)" opacity="0.5" />
                </g>
              )}

              {/* Flow particles */}
              {valveOpen && (
                <g>
                  {[0, 1, 2, 3, 4].map(i => (
                    <circle
                      key={i}
                      cx={50 + i * 55}
                      cy="105"
                      r="8"
                      fill="#60a5fa"
                    >
                      <animate
                        attributeName="cx"
                        values={`${50 + i * 55};${100 + i * 55}`}
                        dur="0.6s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  ))}
                </g>
              )}

              {/* Valve */}
              <rect
                x="320"
                y={valveOpen ? 70 : 85}
                width="25"
                height={valveOpen ? 70 : 40}
                fill={valveOpen ? '#22c55e' : '#ef4444'}
                stroke="#1e293b"
                strokeWidth="2"
                style={{ transition: 'all 0.1s' }}
              />
              <rect x="320" y="60" width="25" height="15" fill="#94a3b8" stroke="#1e293b" strokeWidth="2" />

              {/* Status */}
              <text x="332" y="150" textAnchor="middle" fill={valveOpen ? '#22c55e' : '#ef4444'} fontSize="10" fontWeight="bold">
                {valveOpen ? 'OPEN' : 'CLOSED'}
              </text>

              {/* Pressure gauge */}
              <g transform="translate(200, 200)">
                <circle cx="0" cy="0" r="50" fill="#1e293b" stroke="#475569" strokeWidth="3" />
                <circle cx="0" cy="0" r="42" fill="#0f172a" />

                {/* Gauge markings */}
                {[0, 1, 2, 3, 4, 5].map(i => {
                  const angle = -135 + i * 54;
                  const rad = angle * Math.PI / 180;
                  return (
                    <g key={i}>
                      <line
                        x1={Math.cos(rad) * 32}
                        y1={Math.sin(rad) * 32}
                        x2={Math.cos(rad) * 38}
                        y2={Math.sin(rad) * 38}
                        stroke="white"
                        strokeWidth="2"
                      />
                      <text
                        x={Math.cos(rad) * 24}
                        y={Math.sin(rad) * 24 + 3}
                        fill="white"
                        fontSize="8"
                        textAnchor="middle"
                      >
                        {i * 10}
                      </text>
                    </g>
                  );
                })}

                {/* Needle */}
                {(() => {
                  const pressureBars = Math.abs(pressureInBars(currentPressure));
                  const needleAngle = -135 + Math.min(pressureBars, 50) * 5.4;
                  const needleRad = needleAngle * Math.PI / 180;
                  return (
                    <line
                      x1="0"
                      y1="0"
                      x2={Math.cos(needleRad) * 30}
                      y2={Math.sin(needleRad) * 30}
                      stroke="#ef4444"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  );
                })()}
                <circle cx="0" cy="0" r="5" fill="#ef4444" />

                <text x="0" y="65" textAnchor="middle" fill="#1e293b" fontSize="10" fontWeight="bold">
                  PRESSURE (bar)
                </text>
              </g>

              {/* Readings */}
              <text x="200" y="35" textAnchor="middle" fill="#1e293b" fontSize="14" fontWeight="bold">
                Flow velocity: {flowVelocity} m/s | Pipe: {pipeLength}m
              </text>

              {maxPressure > 0 && (
                <text x="200" y="55" textAnchor="middle" fill="#dc2626" fontSize="12" fontWeight="bold">
                  Peak pressure: {pressureInBars(maxPressure).toFixed(1)} bar!
                </text>
              )}
            </svg>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              {valveOpen ? (
                <button
                  onMouseDown={closeValve}
                  disabled={animating}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: animating ? '#94a3b8' : 'linear-gradient(135deg, #ef4444, #b91c1c)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: animating ? 'not-allowed' : 'pointer',
                    fontWeight: 600
                  }}
                >
                  ⚡ CLOSE VALVE INSTANTLY
                </button>
              ) : (
                <button
                  onMouseDown={resetSimulation}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  🔄 Reset & Try Again
                </button>
              )}
            </div>

            {/* Velocity slider */}
            <div style={{ width: '100%', maxWidth: 350, marginBottom: '1rem' }}>
              <label style={{ color: '#64748b', fontSize: '0.9rem' }}>
                Flow Velocity: {flowVelocity} m/s
              </label>
              <input
                type="range"
                min="1"
                max="6"
                step="0.5"
                value={flowVelocity}
                onChange={(e) => {
                  setFlowVelocity(parseFloat(e.target.value));
                  if (!valveOpen) resetSimulation();
                }}
                style={{ width: '100%' }}
              />
            </div>

            {hasClosedValve && !animating && (
              <button
                onMouseDown={() => {
                  setShowResult(true);
                  if (onGameEvent) {
                    onGameEvent({
                      type: 'result',
                      phase: 'play',
                      prediction,
                      actual: 'c',
                      correct: prediction === 'c'
                    });
                  }
                }}
                style={{
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                See Results
              </button>
            )}

            {showResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: prediction === 'c' ? '#dcfce7' : '#fef3c7',
                borderRadius: 12,
                textAlign: 'center',
                maxWidth: 400
              }}>
                <p style={{ fontWeight: 600, color: prediction === 'c' ? '#166534' : '#92400e' }}>
                  {prediction === 'c' ? '✓ Correct!' : 'Not quite!'}
                </p>
                <p style={{ color: '#1e293b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Pressure rises <strong>dramatically</strong>! At {flowVelocity} m/s, the pressure spike is{' '}
                  <strong>{pressureInBars(calculatePressureRise(flowVelocity)).toFixed(1)} bar</strong>.
                  The water's momentum converts instantly to pressure!
                </p>
                <button
                  onMouseDown={() => goToPhase('review')}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Learn the Physics
                </button>
              </div>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // REVIEW
      // ───────────────────────────────────────────────────
      case 'review':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              The Physics of Water Hammer
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#1d4ed8', marginBottom: '0.75rem' }}>Joukowsky Equation</h3>

              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: 10,
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#1e293b' }}>
                  ΔP = ρ × c × Δv
                </p>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                  Pressure rise = Density × Sound speed × Velocity change
                </p>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong>For water:</strong>
                </p>
                <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li>ρ (density) = 1000 kg/m³</li>
                  <li>c (sound speed) ≈ 1400 m/s</li>
                  <li>So: ΔP = 1,400,000 × Δv (Pa)</li>
                </ul>

                <p style={{ marginTop: '1rem', padding: '0.75rem', background: '#fee2e2', borderRadius: 8 }}>
                  <strong>Example:</strong> Water at 3 m/s suddenly stopped:<br/>
                  ΔP = 1000 × 1400 × 3 = <strong>4,200,000 Pa = 42 bar!</strong>
                </p>
              </div>
            </div>

            <div style={{
              background: '#f0fdf4',
              borderRadius: 12,
              padding: '1rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ color: '#166534', marginBottom: '0.5rem' }}>Key Insight</h4>
              <p style={{ color: '#1e293b', fontSize: '0.9rem' }}>
                The pressure wave travels at the <strong>speed of sound in water</strong> (≈1400 m/s),
                not the flow speed. This is why the pressure spike happens almost instantly throughout
                the pipe system!
              </p>
            </div>

            <button
              onMouseDown={() => goToPhase('twist_predict')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Try a Twist! 🔧
            </button>
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST PREDICT
      // ───────────────────────────────────────────────────
      case 'twist_predict':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              The Critical Time Challenge
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500 }}>
              What if instead of closing the valve instantly, you close it <strong>slowly</strong>?
            </p>

            <svg viewBox="0 0 400 150" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              {/* Fast closure */}
              <g transform="translate(0, 0)">
                <rect x="20" y="30" width="160" height="40" fill="#475569" rx="3" />
                <rect x="25" y="35" width="130" height="30" fill="#3b82f6" opacity="0.5" />
                <rect x="155" y="25" width="20" height="50" fill="#ef4444" />
                <text x="100" y="95" textAnchor="middle" fill="#1e293b" fontSize="11" fontWeight="bold">
                  Instant Close
                </text>
                <text x="100" y="110" textAnchor="middle" fill="#dc2626" fontSize="10">
                  t = 0.01 seconds
                </text>
              </g>

              {/* Slow closure */}
              <g transform="translate(200, 0)">
                <rect x="20" y="30" width="160" height="40" fill="#475569" rx="3" />
                <rect x="25" y="35" width="130" height="30" fill="#3b82f6" opacity="0.5" />
                <rect x="155" y="35" width="20" height="30" fill="#22c55e" />
                <text x="100" y="95" textAnchor="middle" fill="#1e293b" fontSize="11" fontWeight="bold">
                  Slow Close
                </text>
                <text x="100" y="110" textAnchor="middle" fill="#22c55e" fontSize="10">
                  t = 1.0 seconds
                </text>
              </g>
            </svg>

            <p style={{ color: '#64748b', marginBottom: '1rem', textAlign: 'center', maxWidth: 450 }}>
              <strong>Critical time</strong> = 2L/c (time for wave to travel pipe and back)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
              {[
                { id: 'a', text: 'Same pressure regardless of closure speed' },
                { id: 'b', text: 'Slow closure causes HIGHER pressure' },
                { id: 'c', text: 'Slow closure REDUCES peak pressure' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={() => handleTwistPrediction(opt.id)}
                  style={{
                    padding: '1rem',
                    background: twistPrediction === opt.id ? '#f59e0b' : 'white',
                    color: twistPrediction === opt.id ? 'white' : '#1e293b',
                    border: `2px solid ${twistPrediction === opt.id ? '#f59e0b' : '#e2e8f0'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            {twistPrediction && (
              <button
                onMouseDown={() => goToPhase('twist_play')}
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem 2.5rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Compare Them!
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST PLAY
      // ───────────────────────────────────────────────────
      case 'twist_play':
        const criticalTime = (2 * pipeLength) / soundSpeed;
        const effectiveVelocity = closureTime < criticalTime
          ? flowVelocity
          : flowVelocity * (criticalTime / closureTime);
        const peakPressure = pressureInBars(calculatePressureRise(effectiveVelocity));

        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Closure Speed Comparison
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>
              Adjust closure time and see how it affects peak pressure
            </p>

            {/* Pressure graph */}
            <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: 450, marginBottom: '1rem' }}>
              {/* Graph background */}
              <rect x="50" y="20" width="330" height="150" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />

              {/* Grid lines */}
              {[0, 1, 2, 3, 4, 5].map(i => (
                <g key={i}>
                  <line x1="50" y1={20 + i * 30} x2="380" y2={20 + i * 30} stroke="#e2e8f0" />
                  <text x="45" y={25 + i * 30} textAnchor="end" fill="#64748b" fontSize="9">
                    {50 - i * 10}
                  </text>
                </g>
              ))}

              {/* Pressure curve */}
              {twistPressureHistory.length > 0 && (
                <path
                  d={`M 50,170 ${twistPressureHistory.map((p, i) =>
                    `L ${50 + i * 3.3},${170 - (pressureInBars(Math.abs(p)) / 50) * 150}`
                  ).join(' ')}`}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3"
                />
              )}

              {/* Critical time marker */}
              <line
                x1={50 + (criticalTime / 0.3) * 330}
                y1="20"
                x2={50 + (criticalTime / 0.3) * 330}
                y2="170"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              <text
                x={50 + (criticalTime / 0.3) * 330}
                y="185"
                textAnchor="middle"
                fill="#3b82f6"
                fontSize="9"
              >
                Tc = {(criticalTime * 1000).toFixed(0)}ms
              </text>

              {/* Axes labels */}
              <text x="215" y="198" textAnchor="middle" fill="#1e293b" fontSize="10">Time</text>
              <text x="15" y="95" textAnchor="middle" fill="#1e293b" fontSize="10" transform="rotate(-90, 15, 95)">
                Pressure (bar)
              </text>
            </svg>

            {/* Info display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              width: '100%',
              maxWidth: 450,
              marginBottom: '1rem'
            }}>
              <div style={{ background: '#f0f9ff', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Critical Time</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1d4ed8' }}>
                  {(criticalTime * 1000).toFixed(0)} ms
                </p>
              </div>
              <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Closure Time</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#d97706' }}>
                  {(closureTime * 1000).toFixed(0)} ms
                </p>
              </div>
              <div style={{ background: closureTime > criticalTime ? '#dcfce7' : '#fee2e2', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Peak Pressure</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: closureTime > criticalTime ? '#166534' : '#dc2626' }}>
                  {peakPressure.toFixed(1)} bar
                </p>
              </div>
            </div>

            {/* Closure time slider */}
            <div style={{ width: '100%', maxWidth: 400, marginBottom: '1rem' }}>
              <label style={{ color: '#64748b', fontSize: '0.9rem' }}>
                Valve Closure Time: {(closureTime * 1000).toFixed(0)} ms
                {closureTime < criticalTime ? ' (FAST - danger!)' : ' (SLOW - safe)'}
              </label>
              <input
                type="range"
                min="0.01"
                max="0.3"
                step="0.01"
                value={closureTime}
                onChange={(e) => setClosureTime(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <button
              onMouseDown={simulateSlowClosure}
              disabled={twistAnimating}
              style={{
                padding: '0.75rem 2rem',
                background: twistAnimating ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                cursor: twistAnimating ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                marginBottom: '1rem'
              }}
            >
              {twistAnimating ? 'Simulating...' : 'Run Simulation'}
            </button>

            {twistPressureHistory.length > 0 && !twistAnimating && (
              <button
                onMouseDown={() => {
                  setShowTwistResult(true);
                  if (onGameEvent) {
                    onGameEvent({
                      type: 'result',
                      phase: 'twist_play',
                      prediction: twistPrediction,
                      actual: 'c',
                      correct: twistPrediction === 'c'
                    });
                  }
                }}
                style={{
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                See Results
              </button>
            )}

            {showTwistResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: twistPrediction === 'c' ? '#dcfce7' : '#fef3c7',
                borderRadius: 12,
                textAlign: 'center',
                maxWidth: 400
              }}>
                <p style={{ fontWeight: 600, color: twistPrediction === 'c' ? '#166534' : '#92400e' }}>
                  {twistPrediction === 'c' ? '✓ Correct!' : 'Not quite!'}
                </p>
                <p style={{ color: '#1e293b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Slow closure <strong>reduces</strong> peak pressure! When closure time exceeds the
                  critical time (2L/c), the reflected pressure wave has time to dissipate before
                  more pressure builds up.
                </p>
                <button
                  onMouseDown={() => goToPhase('twist_review')}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Understand Why
                </button>
              </div>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST REVIEW
      // ───────────────────────────────────────────────────
      case 'twist_review':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              Critical Time: The Key to Safety
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#ca8a04', marginBottom: '0.75rem' }}>The Critical Time</h3>

              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: 10,
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#1e293b' }}>
                  Tc = 2L / c
                </p>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                  Critical time = 2 × Pipe length / Sound speed
                </p>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong>What happens:</strong>
                </p>
                <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li><strong>Fast closure (t &lt; Tc):</strong> Full pressure spike</li>
                  <li><strong>Slow closure (t &gt; Tc):</strong> Reduced pressure</li>
                  <li>Pressure ∝ Tc / t (when t &gt; Tc)</li>
                </ul>

                <p style={{ marginTop: '1rem', padding: '0.75rem', background: '#dcfce7', borderRadius: 8 }}>
                  <strong>Example:</strong> 100m pipe, c = 1400 m/s<br/>
                  Tc = 2 × 100 / 1400 = <strong>143 ms</strong><br/>
                  Close over 286 ms → pressure halved!
                </p>
              </div>
            </div>

            <div style={{
              background: '#f0fdf4',
              borderRadius: 12,
              padding: '1rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ color: '#166534', marginBottom: '0.5rem' }}>Engineering Solutions</h4>
              <ul style={{ color: '#1e293b', fontSize: '0.9rem', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                <li><strong>Slow-closing valves</strong> - Motorized, timed closure</li>
                <li><strong>Surge tanks</strong> - Air cushion absorbs shock</li>
                <li><strong>Hammer arrestors</strong> - Sealed air chambers</li>
                <li><strong>Check valves</strong> - Prevent backflow surges</li>
              </ul>
            </div>

            <button
              onMouseDown={() => goToPhase('transfer')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              See Real Applications
            </button>
          </div>
        );

      // ───────────────────────────────────────────────────
      // TRANSFER
      // ───────────────────────────────────────────────────
      case 'transfer':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              Water Hammer in the Real World
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center' }}>
              Explore each application to unlock the test
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '1rem',
              width: '100%',
              maxWidth: 600,
              marginBottom: '1.5rem'
            }}>
              {applications.map((app, index) => (
                <div
                  key={index}
                  onMouseDown={() => {
                    setCompletedApps(prev => new Set([...prev, index]));
                    playSound('click');
                  }}
                  style={{
                    background: completedApps.has(index)
                      ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)'
                      : 'white',
                    borderRadius: 12,
                    padding: '1rem',
                    cursor: 'pointer',
                    border: `2px solid ${completedApps.has(index) ? '#22c55e' : '#e2e8f0'}`,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{app.icon}</div>
                  <h3 style={{ color: '#1e293b', fontSize: '1rem', marginBottom: '0.25rem' }}>
                    {app.title}
                    {completedApps.has(index) && ' ✓'}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    {app.description}
                  </p>
                  {completedApps.has(index) && (
                    <p style={{ color: '#1e293b', fontSize: '0.8rem', fontStyle: 'italic' }}>
                      {app.detail}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {completedApps.size} / {applications.length} applications explored
            </p>

            {completedApps.size >= applications.length && (
              <button
                onMouseDown={() => goToPhase('test')}
                style={{
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Take the Test
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // TEST
      // ───────────────────────────────────────────────────
      case 'test':
        const score = testQuestions.reduce((acc, tq, i) => acc + (testAnswers[i] === tq.correct ? 1 : 0), 0);

        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              Water Hammer Mastery Test
            </h2>

            <div style={{ width: '100%', maxWidth: 600 }}>
              {testQuestions.map((tq, qi) => (
                <div
                  key={qi}
                  style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: `2px solid ${
                      testSubmitted
                        ? testAnswers[qi] === tq.correct
                          ? '#22c55e'
                          : testAnswers[qi] !== undefined
                          ? '#ef4444'
                          : '#e2e8f0'
                        : '#e2e8f0'
                    }`
                  }}
                >
                  <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
                    {qi + 1}. {tq.q}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {tq.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onMouseDown={() => handleTestAnswer(qi, oi)}
                        disabled={testSubmitted}
                        style={{
                          padding: '0.6rem 1rem',
                          textAlign: 'left',
                          background: testSubmitted
                            ? oi === tq.correct
                              ? '#dcfce7'
                              : testAnswers[qi] === oi
                              ? '#fee2e2'
                              : '#f8fafc'
                            : testAnswers[qi] === oi
                            ? '#dbeafe'
                            : '#f8fafc',
                          color: '#1e293b',
                          border: `1px solid ${
                            testSubmitted
                              ? oi === tq.correct
                                ? '#22c55e'
                                : testAnswers[qi] === oi
                                ? '#ef4444'
                                : '#e2e8f0'
                              : testAnswers[qi] === oi
                              ? '#3b82f6'
                              : '#e2e8f0'
                          }`,
                          borderRadius: 8,
                          cursor: testSubmitted ? 'default' : 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {testSubmitted && (
                    <p style={{
                      marginTop: '0.75rem',
                      padding: '0.5rem',
                      background: '#f0f9ff',
                      borderRadius: 6,
                      fontSize: '0.85rem',
                      color: '#1e293b'
                    }}>
                      💡 {tq.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {!testSubmitted ? (
              <button
                onMouseDown={submitTest}
                disabled={Object.keys(testAnswers).length < testQuestions.length}
                style={{
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  background: Object.keys(testAnswers).length < testQuestions.length
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: Object.keys(testAnswers).length < testQuestions.length ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                Submit Test ({Object.keys(testAnswers).length}/{testQuestions.length})
              </button>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: score >= 7 ? '#22c55e' : '#f59e0b',
                  marginBottom: '1rem'
                }}>
                  Score: {score}/{testQuestions.length} ({Math.round(score / testQuestions.length * 100)}%)
                </p>

                <button
                  onMouseDown={() => goToPhase('mastery')}
                  style={{
                    padding: '1rem 2.5rem',
                    fontSize: '1.1rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Complete Journey
                </button>
              </div>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // MASTERY
      // ───────────────────────────────────────────────────
      case 'mastery':
        const finalScore = testQuestions.reduce((acc, tq, i) => acc + (testAnswers[i] === tq.correct ? 1 : 0), 0);

        return (
          <div className="flex flex-col items-center" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔧💧🎉</div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Water Hammer Master!
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: 400 }}>
              You now understand why pipes bang and how engineers prevent catastrophic failures!
            </p>

            <div style={{
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 400,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#1d4ed8', marginBottom: '1rem' }}>Your Achievements</h3>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' }}>
                    {finalScore}/{testQuestions.length}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Test Score</p>
                </div>
                <div>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' }}>4</p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Applications</p>
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: 10,
                padding: '1rem',
                textAlign: 'left'
              }}>
                <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
                  Key Takeaways:
                </p>
                <ul style={{ color: '#64748b', fontSize: '0.85rem', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li>ΔP = ρcΔv (Joukowsky equation)</li>
                  <li>Pressure wave travels at sound speed</li>
                  <li>Critical time Tc = 2L/c</li>
                  <li>Slow valve closure saves pipes!</li>
                </ul>
              </div>
            </div>

            {/* Confetti animation */}
            <svg viewBox="0 0 300 100" style={{ width: '100%', maxWidth: 300 }}>
              {[...Array(20)].map((_, i) => (
                <circle
                  key={i}
                  cx={Math.random() * 300}
                  cy={Math.random() * 100}
                  r={3 + Math.random() * 4}
                  fill={['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'][i % 5]}
                >
                  <animate
                    attributeName="cy"
                    values={`${Math.random() * 30};${70 + Math.random() * 30}`}
                    dur={`${1 + Math.random()}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="1;0"
                    dur={`${1 + Math.random()}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </svg>

            <button
              onMouseDown={() => {
                if (onGameEvent) {
                  onGameEvent({ type: 'complete', score: finalScore, total: testQuestions.length });
                }
                goToPhase('hook');
                setTestAnswers({});
                setTestSubmitted(false);
                setCompletedApps(new Set());
                resetSimulation();
                setTwistPressureHistory([]);
              }}
              style={{
                marginTop: '1rem',
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Play Again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const currentIndex = phaseOrder.indexOf(phase);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Water Hammer</span>
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
      <div className="relative pt-16 pb-12 max-w-4xl mx-auto">{renderPhase()}</div>
    </div>
  );
}
