'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// STANDING WAVES - Premium Design System
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

const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook',
  1: 'Predict',
  2: 'Lab',
  3: 'Review',
  4: 'Twist Predict',
  5: 'Twist Lab',
  6: 'Twist Review',
  7: 'Transfer',
  8: 'Test',
  9: 'Mastery'
};

interface StandingWavesRendererProps {
  width?: number;
  height?: number;
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const StandingWavesRenderer: React.FC<StandingWavesRendererProps> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
  // Navigation debouncing
  const lastClickRef = useRef(0);

  // Phase state
  const [phase, setPhase] = useState<number>(() => {
    if (currentPhase !== undefined && PHASES.includes(currentPhase)) return currentPhase;
    return 0;
  });

  // Sync phase with external prop
  useEffect(() => {
    if (currentPhase !== undefined && PHASES.includes(currentPhase)) {
      setPhase(currentPhase);
    }
  }, [currentPhase]);

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [harmonic, setHarmonic] = useState(1);
  const [tension, setTension] = useState(50);
  const [time, setTime] = useState(0);
  const [discoveredHarmonics, setDiscoveredHarmonics] = useState<number[]>([1]);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testIndex, setTestIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showResult, setShowResult] = useState(false);

  const animationRef = useRef<number>();

  // Animation loop
  useEffect(() => {
    let lastTime = performance.now();
    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      setTime(t => t + delta * (1.5 + tension / 100));
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [tension]);

  // Track discovered harmonics
  useEffect(() => {
    if ((phase === 2 || phase === 5) && !discoveredHarmonics.includes(harmonic)) {
      setDiscoveredHarmonics(prev => [...new Set([...prev, harmonic])].sort((a, b) => a - b));
    }
  }, [harmonic, phase, discoveredHarmonics]);

  // Web Audio API sound
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
    } catch { /* Audio not supported */ }
  }, []);

  // Emit game events
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Navigation with debouncing
  const goToPhase = useCallback((newPhase: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (!PHASES.includes(newPhase)) return;
    lastClickRef.current = now;
    setPhase(newPhase);
    playSound('transition');
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(newPhase);
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  // Calculate frequency
  const baseFrequency = 80 + tension * 3.2;
  const frequency = Math.round(baseFrequency * harmonic);

  // Test questions
  const questions = [
    { question: "A rope fixed at both ends is shaken. When do stable standing wave patterns form?", options: ["Any frequency", "Only resonant frequencies fitting whole half-wavelengths", "Only low frequencies", "Only high frequencies"], correct: 1, explanation: "Standing waves form only at resonant frequencies where whole numbers of half-wavelengths fit between the fixed ends." },
    { question: "If the fundamental frequency is 100 Hz, what is the 3rd harmonic?", options: ["150 Hz", "200 Hz", "300 Hz", "400 Hz"], correct: 2, explanation: "Harmonics are integer multiples of the fundamental: 3rd harmonic = 3 x 100 Hz = 300 Hz." },
    { question: "How does increasing rope tension affect wave speed?", options: ["No effect", "Increases speed", "Decreases speed", "Depends on frequency"], correct: 1, explanation: "Wave speed v = sqrt(T/u). Higher tension = faster waves = higher resonant frequencies." },
    { question: "At a node in a standing wave, what do you observe?", options: ["Maximum motion", "Zero motion", "Half maximum", "Random motion"], correct: 1, explanation: "Nodes are points of destructive interference where the string stays stationary." },
    { question: "A string's 2nd harmonic is 330 Hz. What's the fundamental frequency?", options: ["110 Hz", "165 Hz", "220 Hz", "660 Hz"], correct: 1, explanation: "Fundamental = 2nd harmonic / 2 = 330 / 2 = 165 Hz." },
    { question: "What creates a standing wave on a fixed rope?", options: ["Two separate wave sources", "A wave interfering with its reflection", "Air resonance", "Natural vibration"], correct: 1, explanation: "Standing waves form when a traveling wave reflects off a fixed end and interferes with itself." },
    { question: "To raise a string's pitch without changing its length, you should:", options: ["Loosen the string", "Tighten the string", "Use a thicker string", "It's impossible"], correct: 1, explanation: "Increasing tension increases wave speed and therefore frequency (pitch)." },
    { question: "A standing wave has 4 nodes (including both ends). Which harmonic is this?", options: ["2nd harmonic", "3rd harmonic", "4th harmonic", "5th harmonic"], correct: 1, explanation: "The nth harmonic has (n+1) nodes including the endpoints. 4 nodes means n = 3 (3rd harmonic)." },
    { question: "Why do different instruments playing the same note sound different?", options: ["Different volumes", "Different harmonic mixtures (timbre)", "Different wave speeds", "Room acoustics only"], correct: 1, explanation: "Timbre comes from unique combinations of harmonics each instrument produces." },
    { question: "If you double the frequency while keeping wave speed constant, wavelength:", options: ["Doubles", "Halves", "Stays the same", "Quadruples"], correct: 1, explanation: "From v = f*lambda, if v is constant and f doubles, lambda must halve." }
  ];

  // Real-world applications
  const applications = [
    {
      id: 'guitar',
      title: 'Guitar Strings',
      subtitle: 'The Physics of Music',
      description: 'When you pluck a guitar string, it vibrates at specific frequencies determined by length, tension, and mass. Pressing frets shortens the vibrating length, raising pitch.',
      stat: 'f = (1/2L)sqrt(T/u)',
      color: '#f59e0b'
    },
    {
      id: 'laser',
      title: 'Laser Cavities',
      subtitle: 'Standing Light Waves',
      description: 'Lasers use mirrors to create standing light waves. Only wavelengths that form exact standing wave patterns are amplified, producing coherent, monochromatic light.',
      stat: 'L = n*lambda/2',
      color: '#8b5cf6'
    },
    {
      id: 'quantum',
      title: 'Electron Orbitals',
      subtitle: 'Quantum Standing Waves',
      description: 'Electrons in atoms behave as standing waves around the nucleus. Only whole-number wavelengths fit the orbit, explaining why only certain energy levels are allowed.',
      stat: 'n*lambda = 2*pi*r',
      color: '#10b981'
    },
    {
      id: 'acoustics',
      title: 'Room Acoustics',
      subtitle: 'Architectural Resonance',
      description: 'Parallel walls create standing waves called "room modes." Acoustic engineers use diffusers and absorbers to minimize problematic resonances in concert halls.',
      stat: 'f = c/(2L)',
      color: '#ec4899'
    }
  ];

  // Standing wave SVG visualization
  const renderWaveVisualization = () => {
    const stringLength = 400;
    const stringY = 120;
    const n = harmonic;
    const amp = 50 * (1 - n * 0.05);
    const omega = baseFrequency * n * 0.015;

    const generateWavePath = () => {
      const points: string[] = [];
      for (let x = 0; x <= stringLength; x += 2) {
        const relX = x / stringLength;
        const envelope = Math.sin(Math.PI * n * relX);
        const y = stringY + amp * envelope * Math.sin(omega * time);
        points.push(`${50 + x},${y}`);
      }
      return `M ${points.join(' L ')}`;
    };

    const nodes: number[] = [];
    const antinodes: number[] = [];
    for (let i = 0; i <= n; i++) nodes.push(50 + (i * stringLength / n));
    for (let i = 0; i < n; i++) antinodes.push(50 + ((i + 0.5) * stringLength / n));

    return (
      <svg viewBox="0 0 500 240" className="w-full h-full max-h-60">
        <defs>
          <linearGradient id="swStringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <filter id="swGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <radialGradient id="nodeGrad">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </radialGradient>
          <radialGradient id="antinodeGrad">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="500" height="240" fill="#05060a" rx="12" />

        {/* Grid */}
        <g opacity="0.1">
          {[...Array(6)].map((_, i) => (
            <line key={`h${i}`} x1="50" y1={40 + i * 30} x2="450" y2={40 + i * 30} stroke="#6b7488" />
          ))}
        </g>

        {/* Equilibrium line */}
        <line x1="50" y1={stringY} x2="450" y2={stringY} stroke="#6b7488" strokeDasharray="4,4" opacity="0.3" />

        {/* Fixed ends */}
        <rect x="35" y={stringY - 25} width="20" height="50" rx="4" fill="#1e232f" stroke="#252a38" />
        <rect x="445" y={stringY - 25} width="20" height="50" rx="4" fill="#1e232f" stroke="#252a38" />

        {/* Vibrating string */}
        <path d={generateWavePath()} fill="none" stroke="url(#swStringGrad)" strokeWidth="4" strokeLinecap="round" filter="url(#swGlow)" />

        {/* Nodes */}
        {nodes.map((x, i) => (
          <g key={`node-${i}`}>
            <circle cx={x} cy={stringY} r="8" fill="url(#nodeGrad)" opacity="0.9">
              <animate attributeName="r" values="8;10;8" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={x} cy={stringY} r="3" fill="#fecaca" />
          </g>
        ))}

        {/* Antinodes */}
        {antinodes.map((x, i) => (
          <g key={`antinode-${i}`}>
            <line x1={x} y1={stringY - amp - 5} x2={x} y2={stringY + amp + 5} stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
            <circle cx={x} cy={stringY} r="6" fill="url(#antinodeGrad)" opacity="0.8" />
          </g>
        ))}

        {/* Info panel */}
        <g transform="translate(360, 10)">
          <rect x="0" y="0" width="130" height="70" rx="8" fill="#161a24" fillOpacity="0.95" stroke="#252a38" />
          <text x="10" y="22" fill="#6b7488" fontSize="9" fontWeight="600">HARMONIC #{n}</text>
          <text x="10" y="42" fill="#f59e0b" fontSize="18" fontWeight="800">{frequency} Hz</text>
          <text x="10" y="58" fill="#6b7488" fontSize="9">{n + 1} nodes - {n} antinodes</text>
        </g>
      </svg>
    );
  };

  // Application tab SVG graphics
  const renderApplicationGraphic = () => {
    const app = applications[activeApp];

    if (app.id === 'guitar') {
      return (
        <svg viewBox="0 0 300 200" className="w-full h-40">
          <defs>
            <linearGradient id="guitarBody" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#92400e" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <linearGradient id="guitarNeck" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#44403c" />
              <stop offset="100%" stopColor="#292524" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="300" height="200" fill="#05060a" rx="12" />

          {/* Guitar body */}
          <ellipse cx="220" cy="120" rx="60" ry="70" fill="url(#guitarBody)" />
          <ellipse cx="220" cy="120" rx="20" ry="20" fill="#1c1917" />

          {/* Neck */}
          <rect x="40" y="105" width="140" height="30" fill="url(#guitarNeck)" rx="2" />

          {/* Frets */}
          {[60, 85, 105, 120, 135, 150, 162].map((x, i) => (
            <line key={i} x1={x} y1="108" x2={x} y2="132" stroke="#a8a29e" strokeWidth="2" />
          ))}

          {/* Strings */}
          {[110, 115, 120, 125, 130].map((y, i) => (
            <g key={i}>
              <line x1="40" y1={y} x2="280" y2={y} stroke="#f59e0b" strokeWidth="1" opacity="0.7" />
              {i === 2 && (
                <path
                  d={`M 40 ${y} Q 100 ${y + 8 * Math.sin(time * 5)} 160 ${y} Q 220 ${y - 8 * Math.sin(time * 5)} 280 ${y}`}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                />
              )}
            </g>
          ))}

          {/* Finger position */}
          <circle cx="95" cy="120" r="8" fill="#f59e0b" opacity="0.8">
            <animate attributeName="opacity" values="0.8;1;0.8" dur="1s" repeatCount="indefinite" />
          </circle>

          <text x="150" y="180" textAnchor="middle" fill="#a8b0c2" fontSize="11">
            Pressing frets changes effective string length
          </text>
        </svg>
      );
    }

    if (app.id === 'laser') {
      return (
        <svg viewBox="0 0 300 200" className="w-full h-40">
          <defs>
            <linearGradient id="laserBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.2" />
            </linearGradient>
            <filter id="laserGlow">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <rect x="0" y="0" width="300" height="200" fill="#05060a" rx="12" />

          {/* Laser cavity tube */}
          <rect x="40" y="80" width="220" height="40" rx="6" fill="#1e232f" stroke="#252a38" />

          {/* Mirrors */}
          <rect x="30" y="70" width="15" height="60" rx="3" fill="#a78bfa" />
          <rect x="255" y="70" width="15" height="60" rx="3" fill="#a78bfa" opacity="0.7" />

          {/* Standing light wave */}
          <g opacity="0.9">
            {[0, 1, 2, 3, 4].map((i) => {
              const x = 55 + i * 50;
              return (
                <g key={i}>
                  <ellipse cx={x} cy={100} rx="3" ry="15" fill="#8b5cf6">
                    <animate attributeName="ry" values="15;0;15" dur="0.5s" repeatCount="indefinite" />
                  </ellipse>
                </g>
              );
            })}
          </g>

          {/* Laser beam glow */}
          <rect x="50" y="95" width="200" height="10" fill="url(#laserBeam)" filter="url(#laserGlow)" opacity="0.7" />

          {/* Output beam */}
          <line x1="270" y1="100" x2="300" y2="100" stroke="#8b5cf6" strokeWidth="3">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="0.2s" repeatCount="indefinite" />
          </line>

          <text x="150" y="180" textAnchor="middle" fill="#a8b0c2" fontSize="11">
            Only resonant wavelengths amplify between mirrors
          </text>
        </svg>
      );
    }

    if (app.id === 'quantum') {
      return (
        <svg viewBox="0 0 300 200" className="w-full h-40">
          <defs>
            <radialGradient id="nucleus">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </radialGradient>
            <filter id="electronGlow">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          <rect x="0" y="0" width="300" height="200" fill="#05060a" rx="12" />

          {/* Nucleus */}
          <circle cx="150" cy="100" r="15" fill="url(#nucleus)">
            <animate attributeName="r" values="15;17;15" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Electron orbitals as standing waves */}
          {[40, 60, 85].map((r, i) => {
            const points: string[] = [];
            const n = i + 1;
            for (let angle = 0; angle <= 360; angle += 5) {
              const rad = (angle * Math.PI) / 180;
              const waveAmp = 5 * Math.sin(n * rad + time * 2);
              const x = 150 + (r + waveAmp) * Math.cos(rad);
              const y = 100 + (r + waveAmp) * Math.sin(rad);
              points.push(`${x},${y}`);
            }
            return (
              <g key={i}>
                <path
                  d={`M ${points.join(' L ')} Z`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  opacity={0.4 + i * 0.2}
                />
                {/* Electron */}
                <circle
                  cx={150 + r * Math.cos(time * (3 - i))}
                  cy={100 + r * Math.sin(time * (3 - i))}
                  r="4"
                  fill="#10b981"
                  filter="url(#electronGlow)"
                />
              </g>
            );
          })}

          {/* Energy level labels */}
          <text x="200" y="65" fill="#6b7488" fontSize="9">n=3</text>
          <text x="200" y="85" fill="#6b7488" fontSize="9">n=2</text>
          <text x="200" y="110" fill="#6b7488" fontSize="9">n=1</text>

          <text x="150" y="185" textAnchor="middle" fill="#a8b0c2" fontSize="11">
            Only whole-number wavelengths form stable orbitals
          </text>
        </svg>
      );
    }

    if (app.id === 'acoustics') {
      return (
        <svg viewBox="0 0 300 200" className="w-full h-40">
          <rect x="0" y="0" width="300" height="200" fill="#05060a" rx="12" />

          {/* Room outline */}
          <rect x="40" y="40" width="220" height="120" fill="none" stroke="#252a38" strokeWidth="3" />

          {/* Standing wave pattern (room mode) */}
          {[0, 1, 2].map((mode) => {
            const y = 70 + mode * 30;
            const points: string[] = [];
            const n = 2;
            for (let x = 40; x <= 260; x += 4) {
              const relX = (x - 40) / 220;
              const amp = 12 * Math.sin(Math.PI * n * relX) * Math.sin(time * 3 + mode);
              points.push(`${x},${y + amp}`);
            }
            return (
              <path
                key={mode}
                d={`M ${points.join(' L ')}`}
                fill="none"
                stroke="#ec4899"
                strokeWidth="2"
                opacity={0.5 + mode * 0.15}
              />
            );
          })}

          {/* Pressure nodes */}
          <circle cx="150" cy="100" r="6" fill="#ec4899" opacity="0.6">
            <animate attributeName="r" values="6;8;6" dur="1.5s" repeatCount="indefinite" />
          </circle>

          {/* Absorber panels */}
          <rect x="45" y="45" width="8" height="30" fill="#1e232f" rx="2" />
          <rect x="45" y="125" width="8" height="30" fill="#1e232f" rx="2" />
          <rect x="247" y="45" width="8" height="30" fill="#1e232f" rx="2" />
          <rect x="247" y="125" width="8" height="30" fill="#1e232f" rx="2" />

          <text x="150" y="185" textAnchor="middle" fill="#a8b0c2" fontSize="11">
            Room modes cause bass buildup between parallel walls
          </text>
        </svg>
      );
    }

    return null;
  };

  // Calculate score
  const score = answers.filter((a, i) => a === questions[i].correct).length;

  // ==================== PHASE RENDERS ====================

  const renderPhase = () => {
    // HOOK
    if (phase === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
          {/* Floating background elements */}
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

          {/* Icon */}
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-amber-600/20 to-slate-800 border-2 border-amber-500/30 flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20">
            <svg viewBox="0 0 60 60" className="w-3/5 h-3/5">
              <path
                d={`M 5 30 Q 15 ${30 - 12 * Math.sin(time * 4)} 30 30 Q 45 ${30 + 12 * Math.sin(time * 4)} 55 30`}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="5" cy="30" r="4" fill="#fbbf24" />
              <circle cx="55" cy="30" r="4" fill="#fbbf24" />
              <circle cx="30" cy="30" r="3" fill="#10b981" />
            </svg>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Standing Waves
          </h1>

          <p className="text-lg text-slate-300 mb-2 max-w-lg">
            Why do guitar strings only produce <span className="text-amber-400 font-semibold">certain musical notes</span>?
          </p>

          <p className="text-sm text-slate-500 mb-8 max-w-md">
            Discover harmonics, nodes, and the physics of music
          </p>

          {/* Feature cards */}
          <div className="flex gap-4 mb-8">
            {[
              { icon: '🎵', label: 'Harmonics' },
              { icon: '🔬', label: 'Physics' },
              { icon: '🎸', label: 'Music' }
            ].map((item, i) => (
              <div key={i} className="px-6 py-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{item.label}</div>
              </div>
            ))}
          </div>

          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
            className="px-10 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-lg shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all"
          >
            Start Learning
          </button>

          <p className="text-xs text-slate-600 mt-6">
            ~5 minutes - Interactive simulation
          </p>
        </div>
      );
    }

    // PREDICT
    if (phase === 1) {
      const options = [
        { id: 'same', text: 'The same single loop, just faster' },
        { id: 'more', text: 'More loops appear at specific frequencies' },
        { id: 'random', text: 'Completely random patterns' },
        { id: 'disappear', text: 'The wave disappears completely' }
      ];

      return (
        <div className="flex flex-col min-h-[80vh] px-6 py-8">
          <div className="max-w-xl mx-auto w-full">
            <p className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-widest">Predict</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
              What happens when you increase frequency?
            </h2>
            <p className="text-slate-400 mb-6">
              Imagine a guitar string fixed at both ends. You start shaking it slowly, then faster and faster.
            </p>

            <div className="flex flex-col gap-3 mb-8">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setPrediction(opt.id);
                    emitEvent('prediction_made', { value: opt.id });
                  }}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    prediction === opt.id
                      ? 'border-amber-500 bg-amber-500/10 text-white'
                      : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onMouseDown={(e) => { e.preventDefault(); if (prediction) goToPhase(2); }}
                disabled={!prediction}
                className={`px-8 py-3 rounded-xl font-bold transition-all ${
                  prediction
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                Let's Find Out
              </button>
            </div>
          </div>
        </div>
      );
    }

    // LAB
    if (phase === 2) {
      return (
        <div className="flex flex-col min-h-[80vh]">
          {/* Visualization */}
          <div className="flex-1 flex items-center justify-center p-4 min-h-64">
            {renderWaveVisualization()}
          </div>

          {/* Controls */}
          <div className="p-6 bg-slate-900/80 border-t border-slate-800">
            <div className="max-w-xl mx-auto">
              {/* Harmonic slider */}
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-slate-400 font-semibold">Harmonic Mode</label>
                  <span className="text-sm text-amber-400 font-bold">n = {harmonic}</span>
                </div>
                <input
                  type="range" min="1" max="6" value={harmonic}
                  onChange={(e) => setHarmonic(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Discovered harmonics */}
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6].map(h => (
                    <div key={h} className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                      discoveredHarmonics.includes(h)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-800 text-slate-600'
                    } ${harmonic === h ? 'ring-2 ring-amber-400' : ''}`}>
                      {h}
                    </div>
                  ))}
                </div>
                <button
                  onMouseDown={(e) => { e.preventDefault(); if (discoveredHarmonics.length >= 3) goToPhase(3); }}
                  disabled={discoveredHarmonics.length < 3}
                  className={`px-6 py-2 rounded-xl font-bold transition-all ${
                    discoveredHarmonics.length >= 3
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {discoveredHarmonics.length >= 3 ? 'Continue' : `Discover ${3 - discoveredHarmonics.length} more`}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // REVIEW
    if (phase === 3) {
      return (
        <div className="flex flex-col min-h-[80vh] px-6 py-8">
          <div className="max-w-2xl mx-auto w-full">
            <p className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-widest">Understanding</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-6">
              The Physics of Standing Waves
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { icon: '〰️', title: 'Standing Waves', desc: 'Form when a wave reflects and interferes with itself' },
                { icon: '⚫', title: 'Nodes', desc: 'Points of zero motion (destructive interference)' },
                { icon: '🟢', title: 'Antinodes', desc: 'Points of maximum amplitude (constructive interference)' },
                { icon: '🎵', title: 'Harmonics', desc: 'Integer multiples of the fundamental frequency' }
              ].map((item, i) => (
                <div key={i} className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Formula box */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-amber-500/10 to-slate-800 border border-amber-500/20 text-center mb-8">
              <p className="text-xs font-bold text-amber-400 mb-4 uppercase tracking-widest">Key Formula</p>
              <p className="text-3xl font-serif text-white mb-4">
                f<sub>n</sub> = n x f<sub>1</sub> = (n/2L)sqrt(T/u)
              </p>
              <p className="text-sm text-slate-400">
                Frequency depends on harmonic number, length, tension, and mass density
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-lg shadow-amber-500/30"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      );
    }

    // TWIST PREDICT
    if (phase === 4) {
      const options = [
        { id: 'nothing', text: 'Nothing changes - frequency stays the same' },
        { id: 'higher', text: 'All frequencies increase proportionally' },
        { id: 'lower', text: 'All frequencies decrease' },
        { id: 'random', text: 'Changes unpredictably' }
      ];

      return (
        <div className="flex flex-col min-h-[80vh] px-6 py-8">
          <div className="max-w-xl mx-auto w-full">
            <p className="text-xs font-bold text-violet-400 mb-2 uppercase tracking-widest">New Variable</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
              What happens when you increase string tension?
            </h2>
            <p className="text-slate-400 mb-6">
              Think about tuning a guitar - what happens when you tighten the tuning peg?
            </p>

            <div className="flex flex-col gap-3 mb-8">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setTwistPrediction(opt.id);
                    emitEvent('twist_prediction_made', { value: opt.id });
                  }}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    twistPrediction === opt.id
                      ? 'border-violet-500 bg-violet-500/10 text-white'
                      : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onMouseDown={(e) => { e.preventDefault(); if (twistPrediction) goToPhase(5); }}
                disabled={!twistPrediction}
                className={`px-8 py-3 rounded-xl font-bold transition-all ${
                  twistPrediction
                    ? 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/30'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                Test It
              </button>
            </div>
          </div>
        </div>
      );
    }

    // TWIST LAB
    if (phase === 5) {
      return (
        <div className="flex flex-col min-h-[80vh]">
          {/* Visualization */}
          <div className="flex-1 flex items-center justify-center p-4 min-h-64">
            {renderWaveVisualization()}
          </div>

          {/* Controls */}
          <div className="p-6 bg-slate-900/80 border-t border-slate-800">
            <div className="max-w-xl mx-auto">
              {/* Tension slider */}
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-slate-400 font-semibold">String Tension</label>
                  <span className="text-sm text-violet-400 font-bold">{tension}%</span>
                </div>
                <input
                  type="range" min="10" max="100" value={tension}
                  onChange={(e) => setTension(parseInt(e.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>

              {/* Harmonic slider */}
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-slate-400 font-semibold">Harmonic</label>
                  <span className="text-sm text-amber-400 font-bold">n = {harmonic}</span>
                </div>
                <input
                  type="range" min="1" max="6" value={harmonic}
                  onChange={(e) => setHarmonic(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="flex justify-between items-center">
                <div className="px-5 py-3 rounded-xl bg-slate-800">
                  <span className="text-xs text-slate-500">Frequency: </span>
                  <span className="text-lg font-black text-amber-400">{frequency} Hz</span>
                </div>
                <button
                  onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-lg shadow-amber-500/30"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // TWIST REVIEW
    if (phase === 6) {
      return (
        <div className="flex flex-col min-h-[80vh] px-6 py-8">
          <div className="max-w-xl mx-auto w-full">
            <p className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-widest">Deep Insight</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-6">
              You've Mastered the Variables!
            </h2>

            <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-8">
              <p className="text-slate-300 leading-relaxed mb-4">
                Standing wave frequency depends on four key variables:
              </p>
              <ul className="space-y-3">
                <li className="text-white">
                  <strong className="text-amber-400">Harmonic number (n)</strong> - Integer multiples of fundamental
                </li>
                <li className="text-white">
                  <strong className="text-violet-400">Tension (T)</strong> - Higher tension = higher frequency
                </li>
                <li className="text-white">
                  <strong className="text-emerald-400">Length (L)</strong> - Shorter string = higher frequency
                </li>
                <li className="text-white">
                  <strong className="text-pink-400">Mass density (u)</strong> - Lighter string = higher frequency
                </li>
              </ul>
            </div>

            <div className="flex justify-end">
              <button
                onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-lg shadow-amber-500/30"
              >
                See Real Applications
              </button>
            </div>
          </div>
        </div>
      );
    }

    // TRANSFER
    if (phase === 7) {
      const app = applications[activeApp];
      const allAppsCompleted = completedApps.size === applications.length;

      return (
        <div className="flex flex-col min-h-[80vh]">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-3 py-4 bg-slate-900/80 border-b border-slate-800">
            <span className="text-sm text-slate-400">
              Application {activeApp + 1} of {applications.length}
            </span>
            <div className="flex gap-1.5">
              {applications.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all ${
                    completedApps.has(idx) ? 'bg-emerald-500' : idx === activeApp ? 'bg-amber-400' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-slate-500">
              ({completedApps.size}/{applications.length} read)
            </span>
          </div>

          {/* Tab bar */}
          <div className="flex gap-2 px-4 py-3 bg-slate-900/80 border-b border-slate-800 overflow-x-auto">
            {applications.map((a, idx) => {
              const isCompleted = completedApps.has(idx);
              const isCurrent = idx === activeApp;
              const canAccess = isCompleted || idx === activeApp;
              return (
                <button
                  key={a.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const now = Date.now();
                    if (now - lastClickRef.current < 200 || !canAccess) return;
                    lastClickRef.current = now;
                    setActiveApp(idx);
                    emitEvent('app_explored', { appIndex: idx });
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                    isCurrent
                      ? 'bg-slate-800 text-white'
                      : isCompleted
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'text-slate-500 opacity-50 cursor-not-allowed'
                  }`}
                >
                  {isCompleted && !isCurrent ? '✓ ' : ''}{a.title}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-2xl mx-auto">
              {/* Graphic */}
              <div className="mb-6 rounded-xl overflow-hidden border border-slate-800">
                {renderApplicationGraphic()}
              </div>

              {/* Info */}
              <h3 className="text-2xl font-black text-white mb-1">{app.title}</h3>
              <p className="text-sm font-semibold mb-4" style={{ color: app.color }}>{app.subtitle}</p>
              <p className="text-slate-300 leading-relaxed mb-6">{app.description}</p>

              {/* Formula */}
              <div className="p-5 rounded-xl mb-6" style={{ background: `${app.color}15`, borderColor: `${app.color}30`, borderWidth: 1 }}>
                <p className="text-xs font-bold uppercase mb-2" style={{ color: app.color }}>Key Formula</p>
                <p className="text-xl font-serif text-white">{app.stat}</p>
              </div>

              {/* Mark as Read Button */}
              {!completedApps.has(activeApp) ? (
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const now = Date.now();
                    if (now - lastClickRef.current < 200) return;
                    lastClickRef.current = now;
                    const newCompleted = new Set(completedApps);
                    newCompleted.add(activeApp);
                    setCompletedApps(newCompleted);
                    emitEvent('app_explored', { app: app.id });
                    if (activeApp < applications.length - 1) {
                      setTimeout(() => setActiveApp(activeApp + 1), 300);
                    }
                  }}
                  className="w-full py-4 rounded-xl bg-emerald-500/10 border-2 border-emerald-500 text-emerald-400 font-semibold text-lg"
                >
                  ✓ Mark "{app.title}" as Read
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <span className="text-emerald-400 font-semibold">✓ Completed</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="p-4 bg-slate-900/80 border-t border-slate-800">
            <div className="max-w-2xl mx-auto">
              {allAppsCompleted ? (
                <div className="text-center">
                  <div className="mb-3 text-emerald-400 font-semibold">
                    ✓ All {applications.length} applications read!
                  </div>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/30"
                  >
                    Take the Quiz
                  </button>
                </div>
              ) : (
                <div className="text-center py-3 px-4 rounded-xl bg-slate-800 text-slate-500">
                  Read all {applications.length} applications to unlock the quiz ({completedApps.size}/{applications.length} completed)
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // TEST
    if (phase === 8) {
      const q = questions[testIndex];
      const answered = answers[testIndex] !== null;

      if (showResult) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
            <div className="text-7xl mb-6">
              {score >= 8 ? '🏆' : score >= 6 ? '⭐' : '📚'}
            </div>
            <h2 className="text-4xl font-black text-white mb-4">
              {score}/10 Correct
            </h2>
            <p className="text-lg text-slate-400 mb-8 max-w-md">
              {score >= 8 ? "Excellent! You've truly mastered standing waves!" :
               score >= 6 ? "Good job! Review the concepts you missed." :
               "Keep practicing! Review the material and try again."}
            </p>
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }}
              className="px-10 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-lg shadow-lg shadow-emerald-500/30"
            >
              Complete Lesson
            </button>
          </div>
        );
      }

      return (
        <div className="flex flex-col min-h-[80vh] px-6 py-8">
          <div className="max-w-xl mx-auto w-full flex-1">
            {/* Progress */}
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm text-slate-500 font-semibold">
                Question {testIndex + 1} of 10
              </span>
              <div className="flex gap-1.5">
                {answers.slice(0, 10).map((a, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-full ${
                    a !== null ? (a === questions[i].correct ? 'bg-emerald-500' : 'bg-red-500') :
                    i === testIndex ? 'bg-amber-400' : 'bg-slate-700'
                  }`} />
                ))}
              </div>
            </div>

            {/* Question */}
            <h3 className="text-xl font-bold text-white mb-6 leading-relaxed">
              {q.question}
            </h3>

            {/* Options */}
            <div className="flex flex-col gap-3 mb-6">
              {q.options.map((opt, i) => {
                const isSelected = answers[testIndex] === i;
                const isCorrect = i === q.correct;
                const showFeedback = answered;

                return (
                  <button
                    key={i}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (!answered) {
                        const newAnswers = [...answers];
                        newAnswers[testIndex] = i;
                        setAnswers(newAnswers);
                        emitEvent('test_answered', { questionIndex: testIndex, correct: i === q.correct });
                      }
                    }}
                    disabled={answered}
                    className={`p-5 rounded-xl border-2 text-left transition-all ${
                      showFeedback
                        ? isCorrect
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : isSelected
                            ? 'border-red-500 bg-red-500/10'
                            : 'border-slate-700 bg-slate-800/50'
                        : isSelected
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-slate-700 bg-slate-800/50'
                    } ${answered ? 'cursor-default' : 'cursor-pointer hover:border-slate-600'}`}
                  >
                    <span className="text-white">{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {answered && (
              <div className={`p-5 rounded-xl border ${
                answers[testIndex] === q.correct
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <p className="text-white">
                  <strong className={answers[testIndex] === q.correct ? 'text-emerald-400' : 'text-red-400'}>
                    {answers[testIndex] === q.correct ? '✓ Correct!' : '✗ Not quite.'}
                  </strong>{' '}
                  {q.explanation}
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between gap-4 pt-4 border-t border-slate-800">
            <button
              onMouseDown={(e) => { e.preventDefault(); if (testIndex > 0) setTestIndex(testIndex - 1); }}
              disabled={testIndex === 0}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                testIndex === 0 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              ← Previous
            </button>
            {testIndex < 9 ? (
              <button
                onMouseDown={(e) => { e.preventDefault(); if (answered) setTestIndex(testIndex + 1); }}
                disabled={!answered}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  answered
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                Next Question →
              </button>
            ) : (
              <button
                onMouseDown={(e) => { e.preventDefault(); if (answered) setShowResult(true); }}
                disabled={!answered}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  answered
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                See Results →
              </button>
            )}
          </div>
        </div>
      );
    }

    // MASTERY
    if (phase === 9) {
      return (
        <div className="relative flex flex-col items-center justify-center min-h-[80vh] px-6 text-center overflow-hidden">
          {/* Confetti */}
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2.5 h-2.5 rounded-sm animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: ['#f59e0b', '#8b5cf6', '#10b981', '#ec4899'][i % 4],
                animation: `confettiFall 3s ease-out ${Math.random() * 2}s infinite`,
                opacity: 0.8
              }}
            />
          ))}

          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/30 z-10">
            <span className="text-5xl">🎓</span>
          </div>

          <h1 className="text-4xl font-black text-white mb-4 z-10">
            Congratulations!
          </h1>
          <p className="text-lg text-slate-400 mb-6 max-w-md z-10">
            You've mastered Standing Waves! You now understand the physics behind every musical instrument.
          </p>

          {/* Score */}
          <div className="px-8 py-4 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-8 z-10">
            <p className="text-sm text-slate-500 mb-1">Quiz Score</p>
            <p className={`text-4xl font-black ${score >= 8 ? 'text-emerald-400' : 'text-amber-400'}`}>{score}/10</p>
          </div>

          {/* Topics learned */}
          <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-8 max-w-md z-10">
            <p className="text-xs font-bold text-emerald-400 mb-3 uppercase tracking-widest">What You Learned</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Harmonics', 'Nodes', 'Antinodes', 'Tension', 'Frequency', 'Music Physics'].map((topic, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-slate-800 text-white text-sm font-semibold">
                  {topic}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-4 z-10">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setPhase(0);
                setTestIndex(0);
                setAnswers(Array(10).fill(null));
                setShowResult(false);
                setDiscoveredHarmonics([1]);
                setActiveApp(0);
                setCompletedApps(new Set());
              }}
              className="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-all"
            >
              Replay Lesson
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-lg shadow-amber-500/30"
            >
              Free Exploration
            </button>
          </div>

          <style>{`
            @keyframes confettiFall {
              0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
              100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
          `}</style>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Standing Waves</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-amber-400 w-6 shadow-lg shadow-amber-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-amber-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default StandingWavesRenderer;
