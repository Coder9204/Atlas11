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

interface Magnet {
  x: number;
  y: number;
  angle: number;
  strength: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const TEST_QUESTIONS = [
  {
    question: 'Which way do magnetic field lines point?',
    options: [
      'From south to north, inside the magnet',
      'From north to south, outside the magnet',
      'Randomly in all directions',
      'Straight up and down only'
    ],
    correct: 1
  },
  {
    question: 'What does it mean when field lines are close together?',
    options: [
      'The field is weak',
      'The magnet is broken',
      'The field is strong',
      'The temperature is high'
    ],
    correct: 2
  },
  {
    question: 'Why can\'t magnetic field lines ever cross?',
    options: [
      'They repel each other',
      'A point can only have one field direction',
      'The magnet would break',
      'It would create infinite energy'
    ],
    correct: 1
  },
  {
    question: 'How does a compass work?',
    options: [
      'It measures electric current',
      'Its magnetic needle aligns with field lines',
      'It detects gravity',
      'It uses GPS satellites'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Compass Navigation',
    description: 'Compass needles are tiny magnets that align with Earth\'s field, pointing toward magnetic north.',
    icon: '🧭'
  },
  {
    title: 'MRI Machines',
    description: 'Powerful magnets create precise fields. Field mapping ensures accurate medical imaging.',
    icon: '🏥'
  },
  {
    title: 'Particle Accelerators',
    description: 'Mapped magnetic fields steer particles at near-light speeds in exact circular paths.',
    icon: '⚛️'
  },
  {
    title: 'Magnetic Shielding',
    description: 'Understanding field patterns helps design shields for sensitive electronics.',
    icon: '🛡️'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
function calculateField(px: number, py: number, magnets: Magnet[]): { bx: number; by: number } {
  let bx = 0;
  let by = 0;

  for (const m of magnets) {
    const dx = px - m.x;
    const dy = py - m.y;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r < 10) continue;

    const r3 = r * r * r;
    const mx = Math.cos(m.angle * Math.PI / 180) * m.strength;
    const my = Math.sin(m.angle * Math.PI / 180) * m.strength;

    const dot = mx * dx + my * dy;
    bx += (3 * dx * dot / (r3 * r * r) - mx / r3) * 1000;
    by += (3 * dy * dot / (r3 * r * r) - my / r3) * 1000;
  }

  return { bx, by };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const MagneticMappingRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(4).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Simulation state
  const [magnets, setMagnets] = useState<Magnet[]>([{ x: 200, y: 140, angle: 0, strength: 100 }]);
  const [showFieldLines, setShowFieldLines] = useState(true);
  const [showCompassGrid, setShowCompassGrid] = useState(false);
  const [selectedMagnet, setSelectedMagnet] = useState<number | null>(null);
  const [showEarthField, setShowEarthField] = useState(false);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

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

  useEffect(() => {
    if (phase === 2) {
      setMagnets([{ x: 200, y: 140, angle: 0, strength: 100 }]);
      setShowFieldLines(true);
      setShowCompassGrid(false);
    }
    if (phase === 5) {
      setShowEarthField(false);
    }
  }, [phase]);

  const addMagnet = () => {
    if (magnets.length >= 3) return;
    setMagnets([...magnets, {
      x: 100 + Math.random() * 200,
      y: 80 + Math.random() * 120,
      angle: Math.random() * 360,
      strength: 80
    }]);
  };

  const rotateMagnet = (index: number, delta: number) => {
    setMagnets(prev => prev.map((m, i) => i === index ? { ...m, angle: (m.angle + delta + 360) % 360 } : m));
  };

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

  const calculateScore = () => testAnswers.reduce((score, answer, index) => score + (answer === TEST_QUESTIONS[index].correct ? 1 : 0), 0);

  const renderMagneticField = (mags: Magnet[], fieldLines: boolean, compassGrid: boolean) => {
    const fieldLineStarts: { x: number; y: number; reverse: boolean }[] = [];
    if (fieldLines) {
      for (const m of mags) {
        const nAngle = m.angle * Math.PI / 180;
        const nPoleX = m.x + Math.cos(nAngle) * 25;
        const nPoleY = m.y + Math.sin(nAngle) * 25;
        for (let i = 0; i < 8; i++) {
          const a = nAngle + (i - 3.5) * 0.3;
          fieldLineStarts.push({ x: nPoleX + Math.cos(a) * 5, y: nPoleY + Math.sin(a) * 5, reverse: false });
        }
      }
    }

    const tracedLines: string[] = [];
    for (const start of fieldLineStarts) {
      let x = start.x;
      let y = start.y;
      let path = `M ${x} ${y}`;
      for (let step = 0; step < 100; step++) {
        const { bx, by } = calculateField(x, y, mags);
        const mag = Math.sqrt(bx * bx + by * by);
        if (mag < 0.01) break;
        const stepSize = 5;
        const dir = start.reverse ? -1 : 1;
        x += (bx / mag) * stepSize * dir;
        y += (by / mag) * stepSize * dir;
        if (x < 0 || x > 400 || y < 0 || y > 280) break;
        path += ` L ${x} ${y}`;
      }
      tracedLines.push(path);
    }

    const compassPositions: { x: number; y: number }[] = [];
    if (compassGrid) {
      for (let x = 30; x < 400; x += 40) {
        for (let y = 30; y < 280; y += 40) {
          compassPositions.push({ x, y });
        }
      }
    }

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#111827" />
        {fieldLines && tracedLines.map((path, i) => (<path key={i} d={path} fill="none" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />))}
        {compassGrid && compassPositions.map((pos, i) => {
          const { bx, by } = calculateField(pos.x, pos.y, mags);
          const angle = Math.atan2(by, bx) * 180 / Math.PI;
          return (
            <g key={i} transform={`translate(${pos.x}, ${pos.y}) rotate(${angle})`}>
              <line x1="-8" y1="0" x2="8" y2="0" stroke="#ef4444" strokeWidth="2" />
              <polygon points="8,0 4,-3 4,3" fill="#ef4444" />
              <circle cx="0" cy="0" r="2" fill="#fbbf24" />
            </g>
          );
        })}
        {mags.map((m, i) => (
          <g key={i} transform={`translate(${m.x}, ${m.y}) rotate(${m.angle})`} style={{ cursor: 'pointer' }} onMouseDown={() => setSelectedMagnet(i)}>
            <rect x="-30" y="-12" width="30" height="24" rx="4" fill="#ef4444" />
            <rect x="0" y="-12" width="30" height="24" rx="4" fill="#3b82f6" />
            <text x="-15" y="5" textAnchor="middle" className="fill-white text-xs font-bold">N</text>
            <text x="15" y="5" textAnchor="middle" className="fill-white text-xs font-bold">S</text>
            {selectedMagnet === i && (<circle r="35" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4,4" />)}
          </g>
        ))}
        <rect x="10" y="10" width="100" height="40" rx="4" fill="#1f2937" opacity="0.9" />
        <text x="60" y="28" textAnchor="middle" className="fill-gray-400 text-xs">Magnets: {mags.length}</text>
        <text x="60" y="43" textAnchor="middle" className="fill-gray-500 text-xs">Click to select</text>
      </svg>
    );
  };

  const renderEarthField = () => (
    <svg viewBox="0 0 400 280" className="w-full h-56">
      <rect width="400" height="280" fill="#0f172a" />
      {[...Array(30)].map((_, i) => (<circle key={i} cx={Math.random() * 400} cy={Math.random() * 280} r={Math.random() * 1.5} fill="white" opacity={0.5 + Math.random() * 0.5} />))}
      <circle cx="200" cy="140" r="80" fill="#1e40af" />
      <ellipse cx="200" cy="140" rx="80" ry="30" fill="#22c55e" fillOpacity="0.5" />
      <circle cx="180" cy="120" r="15" fill="#22c55e" fillOpacity="0.6" />
      <circle cx="220" cy="150" r="20" fill="#22c55e" fillOpacity="0.6" />
      <circle cx="200" cy="70" r="5" fill="#3b82f6" />
      <text x="200" y="55" textAnchor="middle" className="fill-blue-400 text-xs">Magnetic S</text>
      <circle cx="200" cy="210" r="5" fill="#ef4444" />
      <text x="200" y="230" textAnchor="middle" className="fill-red-400 text-xs">Magnetic N</text>
      {showEarthField && (
        <g>
          {[-1, 1].map(side => ([30, 60, 90, 120, 150].map((offset, i) => (<path key={`${side}-${i}`} d={`M ${200 + side * 5} 70 C ${200 + side * offset} 40, ${200 + side * offset} 240, ${200 + side * 5} 210`} fill="none" stroke="#60a5fa" strokeWidth="1.5" opacity={0.4 + (5 - i) * 0.1} />))))}
          <polygon points="120,140 130,135 130,145" fill="#60a5fa" />
          <polygon points="280,140 270,145 270,135" fill="#60a5fa" />
        </g>
      )}
      <g transform="translate(120, 140)">
        <circle r="15" fill="#1f2937" stroke="#6b7280" strokeWidth="2" />
        <line x1="0" y1="10" x2="0" y2="-10" stroke="#ef4444" strokeWidth="2" />
        <polygon points="0,-10 -3,-5 3,-5" fill="#ef4444" />
        <text x="0" y="30" textAnchor="middle" className="fill-gray-400 text-xs">Compass</text>
      </g>
      <rect x="280" y="20" width="110" height="70" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
      <text x="335" y="40" textAnchor="middle" className="fill-gray-400 text-xs">Earth&apos;s Field</text>
      <text x="335" y="58" textAnchor="middle" className="fill-cyan-400 text-xs">~25-65 uT</text>
      <text x="335" y="76" textAnchor="middle" className="fill-gray-500 text-xs">(very weak!)</text>
    </svg>
  );

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-red-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-red-100 to-blue-200 bg-clip-text text-transparent">
        Seeing the Invisible
      </h1>
      <p className="text-lg text-slate-400 max-w-md mb-10">
        How can we map forces we cannot see?
      </p>
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-blue-500/5 rounded-3xl" />
        <div className="relative">
          <div className="text-6xl mb-6">🧲</div>
          <div className="mt-4 space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Magnetic fields are invisible, yet we can map them perfectly!
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              Scientists have known their shapes for centuries - long before modern instruments.
            </p>
            <div className="pt-2">
              <p className="text-base text-red-400 font-semibold">
                Iron filings and tiny compasses reveal the hidden architecture!
              </p>
            </div>
          </div>
        </div>
      </div>
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-red-500 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover the Secret
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2"><span className="text-red-400">+</span>Interactive Lab</div>
        <div className="flex items-center gap-2"><span className="text-red-400">+</span>Real-World Examples</div>
        <div className="flex items-center gap-2"><span className="text-red-400">+</span>Knowledge Test</div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          If you sprinkle iron filings around a bar magnet, what pattern will they form?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Random scattered pattern' },
          { id: 'B', text: 'Curved lines from N to S pole' },
          { id: 'C', text: 'A perfect circle around the magnet' },
          { id: 'D', text: 'Straight parallel lines' }
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
            Correct! Iron filings align along curved field lines from North to South!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-red-600 to-blue-600 text-white font-semibold rounded-xl"
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Magnetic Field Mapper</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderMagneticField(magnets, showFieldLines, showCompassGrid)}
      </div>
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        <button onMouseDown={(e) => { e.preventDefault(); setShowFieldLines(!showFieldLines); }} className={`px-4 py-2 rounded-lg font-bold text-sm ${showFieldLines ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-300'}`}>
          Field Lines
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); setShowCompassGrid(!showCompassGrid); }} className={`px-4 py-2 rounded-lg font-bold text-sm ${showCompassGrid ? 'bg-red-600 text-white' : 'bg-slate-600 text-slate-300'}`}>
          Compass Grid
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); addMagnet(); }} className="px-4 py-2 rounded-lg font-bold text-sm bg-slate-600 text-slate-300 hover:bg-slate-500" disabled={magnets.length >= 3}>
          + Add Magnet
        </button>
      </div>
      {selectedMagnet !== null && (
        <div className="flex justify-center gap-4 mb-4">
          <button onMouseDown={(e) => { e.preventDefault(); rotateMagnet(selectedMagnet, -30); }} className="px-4 py-2 bg-slate-600 text-white rounded-lg">Rotate Left</button>
          <button onMouseDown={(e) => { e.preventDefault(); rotateMagnet(selectedMagnet, 30); }} className="px-4 py-2 bg-slate-600 text-white rounded-lg">Rotate Right</button>
          <button onMouseDown={(e) => { e.preventDefault(); setMagnets(prev => prev.filter((_, i) => i !== selectedMagnet)); setSelectedMagnet(null); }} className="px-4 py-2 bg-red-600 text-white rounded-lg">Remove</button>
        </div>
      )}
      <div className="bg-gradient-to-r from-red-900/40 to-blue-900/40 rounded-xl p-4 max-w-2xl w-full mb-6">
        <p className="text-slate-300 text-center">
          Field lines show direction (N to S outside magnet) and density shows strength. Try adding magnets!
        </p>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }} className="px-6 py-3 bg-gradient-to-r from-red-600 to-blue-600 text-white font-semibold rounded-xl">
        Understand the Physics
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Reading Magnetic Field Maps</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl space-y-4">
        <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-600">
          <h3 className="text-blue-400 font-bold mb-2">Field Line Rules</h3>
          <ul className="text-slate-300 space-y-1">
            <li>Lines point from <span className="text-red-400">N</span> to <span className="text-blue-400">S</span> outside the magnet</li>
            <li>Lines <span className="text-yellow-400">never cross</span> (each point has one direction)</li>
            <li>Closer lines = <span className="text-green-400">stronger field</span></li>
            <li>Lines form <span className="text-purple-400">closed loops</span> (continue inside magnet)</li>
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-700/50 rounded-lg text-center">
            <div className="text-3xl mb-2">🧲</div>
            <h4 className="text-white font-bold mb-1">Iron Filings</h4>
            <p className="text-slate-400 text-sm">Each filing becomes a tiny magnet and aligns with local field</p>
          </div>
          <div className="p-4 bg-slate-700/50 rounded-lg text-center">
            <div className="text-3xl mb-2">🧭</div>
            <h4 className="text-white font-bold mb-1">Compass Array</h4>
            <p className="text-slate-400 text-sm">Each compass needle points along the field direction</p>
          </div>
        </div>
        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300">
            <strong>Key Insight:</strong> Field lines are a visualization tool, not real physical objects.
            But the patterns they reveal are real and predictable!
          </p>
        </div>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }} className="mt-8 px-6 py-3 bg-gradient-to-r from-red-600 to-blue-600 text-white font-semibold rounded-xl">
        Earth&apos;s Giant Magnet
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Earth Question</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Earth has a magnetic field that compasses detect. Which way does a compass needle point?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Toward true geographic north' },
          { id: 'B', text: 'Toward magnetic north (slightly different!)' },
          { id: 'C', text: 'Toward the sun' },
          { id: 'D', text: 'Random direction based on location' }
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
            Correct! Compasses point to magnetic north, which differs from geographic north!
          </p>
          <button onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }} className="mt-4 px-6 py-3 bg-gradient-to-r from-red-600 to-blue-600 text-white font-semibold rounded-xl">
            See Earth&apos;s Field
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Earth&apos;s Magnetic Field</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
        {renderEarthField()}
        <div className="flex justify-center mt-6">
          <button onMouseDown={(e) => { e.preventDefault(); setShowEarthField(!showEarthField); }} className={`px-6 py-3 rounded-lg font-bold ${showEarthField ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-300'}`}>
            {showEarthField ? 'Hide Field Lines' : 'Show Field Lines'}
          </button>
        </div>
        <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
          <p className="text-slate-300 text-center">
            Earth acts like a giant bar magnet! But the magnetic poles are
            <span className="text-yellow-400 font-bold"> offset from the geographic poles</span>.
            Magnetic north moves ~40km/year!
          </p>
        </div>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }} className="px-6 py-3 bg-gradient-to-r from-red-600 to-blue-600 text-white font-semibold rounded-xl">
        Understand Earth&apos;s Field
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Earth&apos;s Magnetic Shield</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl space-y-4">
        <div className="p-4 bg-green-900/30 rounded-lg border border-green-600">
          <h3 className="text-green-400 font-bold mb-2">The Geodynamo</h3>
          <p className="text-slate-300">
            Earth&apos;s magnetic field is generated by <span className="text-yellow-400 font-bold">
            convecting molten iron</span> in the outer core. This &quot;geodynamo&quot; creates
            a field that shields us from solar wind!
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <h4 className="text-cyan-400 font-bold mb-2">Magnetic Declination</h4>
            <p className="text-slate-300 text-sm">
              The angle between magnetic north and true north.
              Varies by location (can be 20+ degrees in some places!).
            </p>
          </div>
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <h4 className="text-purple-400 font-bold mb-2">Field Strength</h4>
            <p className="text-slate-300 text-sm">
              25-65 microtesla. About 100x weaker than
              a refrigerator magnet, but enough for compasses!
            </p>
          </div>
        </div>
        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300 text-sm">
            <strong>Fun Fact:</strong> Earth&apos;s magnetic poles flip every few hundred thousand years!
            We&apos;re currently in a long-running &quot;normal&quot; period, but the field is slowly weakening.
          </p>
        </div>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl">
        Explore Real Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {TRANSFER_APPS.map((app, index) => (
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
          <span className="text-3xl">{TRANSFER_APPS[activeAppTab].icon}</span>
          <h3 className="text-xl font-bold text-white">{TRANSFER_APPS[activeAppTab].title}</h3>
        </div>
        <p className="text-lg text-slate-300 mt-4">{TRANSFER_APPS[activeAppTab].description}</p>
        {!completedApps.has(activeAppTab) && (
          <button onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }} className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium">
            Mark as Understood
          </button>
        )}
      </div>
      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">{TRANSFER_APPS.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />))}</div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>
      {completedApps.size >= 4 && (
        <button onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-blue-600 text-white font-semibold rounded-xl">
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
          {TEST_QUESTIONS.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
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
            className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(-1) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-red-600 to-blue-600 text-white'}`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{calculateScore() >= 3 ? '🎉' : '📚'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/4</h3>
          <p className="text-slate-300 mb-6">{calculateScore() >= 3 ? 'Excellent! You understand magnetic field mapping!' : 'Keep studying! Review and try again.'}</p>
          {calculateScore() >= 3 ? (
            <button onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }} className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl">
              Claim Your Mastery Badge
            </button>
          ) : (
            <button onMouseDown={(e) => { e.preventDefault(); setShowTestResults(false); setTestAnswers(Array(4).fill(-1)); goToPhase(3); }} className="px-8 py-4 bg-gradient-to-r from-red-600 to-blue-600 text-white font-semibold rounded-xl">
              Review and Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-red-900/50 via-purple-900/50 to-blue-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🧲</div>
        <h1 className="text-3xl font-bold text-white mb-4">Magnetic Mapping Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You&apos;ve mastered magnetic field visualization!</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🧭</div><p className="text-sm text-slate-300">Field Lines N to S</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">⚡</div><p className="text-sm text-slate-300">Density = Strength</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🌍</div><p className="text-sm text-slate-300">Earth&apos;s Geodynamo</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🔬</div><p className="text-sm text-slate-300">Lines Never Cross</p></div>
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Magnetic Mapping</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-gradient-to-r from-red-400 to-blue-400 w-6 shadow-lg shadow-purple-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium bg-gradient-to-r from-red-400 to-blue-400 bg-clip-text text-transparent">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default MagneticMappingRenderer;
