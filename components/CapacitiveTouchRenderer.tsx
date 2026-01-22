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

interface TouchPoint {
  x: number;
  y: number;
  capacitance: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const TEST_QUESTIONS = [
  {
    question: 'What does your finger change when touching a capacitive screen?',
    options: [
      'The screen temperature',
      'The local capacitance in the touch grid',
      'The screen brightness',
      'The electrical resistance'
    ],
    correct: 1
  },
  {
    question: 'Why don\'t regular gloves work on touchscreens?',
    options: [
      'They\'re too thick to press hard enough',
      'They block the capacitive coupling with your body',
      'They create static electricity',
      'The screen can\'t sense warmth through them'
    ],
    correct: 1
  },
  {
    question: 'How does the screen know WHERE you touched?',
    options: [
      'A camera watches your finger',
      'Pressure sensors under the glass',
      'Grid of electrodes detects which intersection changed',
      'Sound waves bounce off your finger'
    ],
    correct: 2
  },
  {
    question: 'Why can capacitive screens detect multiple touches?',
    options: [
      'Multiple pressure sensors',
      'Each touch point changes capacitance at a different grid location',
      'The screen has multiple layers',
      'The CPU is very fast'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Smartphones & Tablets',
    description: 'Projected capacitive touch (PCT) enables multi-touch gestures like pinch-to-zoom with incredible precision.',
    icon: '📱'
  },
  {
    title: 'Touch Gloves',
    description: 'Conductive threads in fingertips allow capacitive coupling through the glove material.',
    icon: '🧤'
  },
  {
    title: 'Stylus Pens',
    description: 'Active styluses have conductive tips or electronics that mimic finger capacitance for drawing.',
    icon: '✏️'
  },
  {
    title: 'Car Touchscreens',
    description: 'Infotainment systems use capacitive touch. Some new cars add haptic feedback for "button" feel.',
    icon: '🚗'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const CapacitiveTouchRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
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
  const [touchPoints, setTouchPoints] = useState<TouchPoint[]>([]);
  const [isFingerMode, setIsFingerMode] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [touchMode, setTouchMode] = useState<'finger' | 'glove' | 'capacitiveGlove'>('finger');

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);

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
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete, onGameEvent]);

  const handleSvgTouch = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const points: TouchPoint[] = [];

    if ('touches' in e) {
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const x = ((touch.clientX - rect.left) / rect.width) * 400;
        const y = ((touch.clientY - rect.top) / rect.height) * 280;
        points.push({
          x, y,
          capacitance: isFingerMode || touchMode === 'finger' || touchMode === 'capacitiveGlove' ? 1 : 0
        });
      }
    } else {
      const x = ((e.clientX - rect.left) / rect.width) * 400;
      const y = ((e.clientY - rect.top) / rect.height) * 280;
      points.push({
        x, y,
        capacitance: isFingerMode || touchMode === 'finger' || touchMode === 'capacitiveGlove' ? 1 : 0
      });
    }
    setTouchPoints(points);
  };

  const handleTouchEnd = () => setTouchPoints([]);

  useEffect(() => {
    if (phase === 2) {
      setTouchPoints([]);
      setIsFingerMode(true);
      setShowGrid(true);
    }
    if (phase === 5) {
      setTouchPoints([]);
      setTouchMode('finger');
    }
  }, [phase]);

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

  const renderTouchScreen = (mode: 'finger' | 'glove' | 'capacitiveGlove' = 'finger', points: TouchPoint[]) => {
    const gridSize = 8;
    const cellWidth = 400 / gridSize;
    const cellHeight = 280 / gridSize;

    return (
      <svg
        ref={svgRef}
        viewBox="0 0 400 280"
        className="w-full h-56 cursor-pointer touch-none"
        onMouseDown={handleSvgTouch}
        onMouseMove={(e) => e.buttons && handleSvgTouch(e)}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onTouchStart={handleSvgTouch}
        onTouchMove={handleSvgTouch}
        onTouchEnd={handleTouchEnd}
      >
        <rect width="400" height="280" fill="#1a1a2e" rx="8" />
        {showGrid && (
          <g>
            {[...Array(gridSize + 1)].map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * cellHeight} x2="400" y2={i * cellHeight} stroke="#3b82f6" strokeWidth="1" opacity="0.3" />
            ))}
            {[...Array(gridSize + 1)].map((_, i) => (
              <line key={`v${i}`} x1={i * cellWidth} y1="0" x2={i * cellWidth} y2="280" stroke="#22c55e" strokeWidth="1" opacity="0.3" />
            ))}
            {[...Array(gridSize + 1)].map((_, i) =>
              [...Array(gridSize + 1)].map((_, j) => (
                <circle key={`n${i}-${j}`} cx={i * cellWidth} cy={j * cellHeight} r="3" fill="#4b5563" />
              ))
            )}
          </g>
        )}
        {points.map((point, idx) => {
          const gridX = Math.round(point.x / cellWidth);
          const gridY = Math.round(point.y / cellHeight);
          const detected = point.capacitance > 0;

          return (
            <g key={idx}>
              <circle cx={point.x} cy={point.y} r={detected ? "25" : "20"} fill={detected ? "rgba(59, 130, 246, 0.3)" : "rgba(239, 68, 68, 0.3)"} stroke={detected ? "#3b82f6" : "#ef4444"} strokeWidth="2" />
              {detected && showGrid && (
                <g className="animate-pulse">
                  {[-1, 0, 1].map(dx =>
                    [-1, 0, 1].map(dy => {
                      const nx = gridX + dx;
                      const ny = gridY + dy;
                      if (nx >= 0 && nx <= gridSize && ny >= 0 && ny <= gridSize) {
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const intensity = 1 - dist * 0.3;
                        return <circle key={`effect-${dx}-${dy}`} cx={nx * cellWidth} cy={ny * cellHeight} r="6" fill={`rgba(59, 130, 246, ${intensity * 0.8})`} />;
                      }
                      return null;
                    })
                  )}
                  {[...Array(8)].map((_, i) => {
                    const angle = (i / 8) * Math.PI * 2;
                    const length = 30;
                    return (
                      <line key={`field-${i}`} x1={point.x} y1={point.y} x2={point.x + Math.cos(angle) * length} y2={point.y + Math.sin(angle) * length} stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
                    );
                  })}
                </g>
              )}
              <text x={point.x} y={point.y - 35} textAnchor="middle" className="text-2xl">
                {mode === 'finger' ? '👆' : mode === 'glove' ? '🧤' : '🧤'}
              </text>
              <rect x={point.x - 35} y={point.y + 30} width="70" height="20" rx="4" fill={detected ? '#22c55e' : '#ef4444'} />
              <text x={point.x} y={point.y + 44} textAnchor="middle" className="fill-white text-xs font-bold">{detected ? 'DETECTED' : 'NO SIGNAL'}</text>
            </g>
          );
        })}
        {points.length === 0 && <text x="200" y="140" textAnchor="middle" className="fill-gray-500 text-sm">Touch or click anywhere!</text>}
        {points.length > 0 && points[0].capacitance > 0 && (
          <g>
            <rect x="10" y="10" width="100" height="40" rx="4" fill="#1f2937" opacity="0.9" />
            <text x="60" y="28" textAnchor="middle" className="fill-gray-400 text-xs">Position</text>
            <text x="60" y="43" textAnchor="middle" className="fill-cyan-400 text-xs font-bold">({Math.round(points[0].x)}, {Math.round(points[0].y)})</text>
          </g>
        )}
      </svg>
    );
  };

  const renderCapacitorDiagram = () => (
    <svg viewBox="0 0 300 150" className="w-full h-32">
      <rect width="300" height="150" fill="#111827" />
      <g transform="translate(50, 20)">
        <text x="50" y="0" textAnchor="middle" className="fill-gray-400 text-xs">Traditional Capacitor</text>
        <line x1="20" y1="30" x2="20" y2="90" stroke="#3b82f6" strokeWidth="4" />
        <line x1="80" y1="30" x2="80" y2="90" stroke="#3b82f6" strokeWidth="4" />
        <text x="50" y="70" textAnchor="middle" className="fill-yellow-400 text-xs">Gap</text>
        <rect x="30" y="40" width="40" height="30" fill="#fbbf24" fillOpacity="0.3" stroke="#fbbf24" strokeDasharray="2,2" />
        <text x="50" y="120" textAnchor="middle" className="fill-gray-500 text-xs">2 plates, 1 gap</text>
      </g>
      <g transform="translate(180, 20)">
        <text x="50" y="0" textAnchor="middle" className="fill-gray-400 text-xs">Touchscreen + Finger</text>
        <line x1="20" y1="30" x2="20" y2="90" stroke="#3b82f6" strokeWidth="4" />
        <text x="20" y="105" textAnchor="middle" className="fill-blue-400 text-xs">Screen</text>
        <ellipse cx="80" cy="60" rx="20" ry="30" fill="#fca5a5" stroke="#ef4444" strokeWidth="2" />
        <text x="80" y="105" textAnchor="middle" className="fill-red-400 text-xs">Finger</text>
        <path d="M 25 50 Q 50 50 75 50" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4,4" />
        <path d="M 25 70 Q 50 70 75 70" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4,4" />
        <text x="50" y="45" textAnchor="middle" className="fill-green-400 text-xs">E-field</text>
      </g>
    </svg>
  );

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        The Invisible Touch
      </h1>
      <p className="text-lg text-slate-400 max-w-md mb-10">
        How does your phone know exactly where you touched?
      </p>
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 rounded-3xl" />
        <div className="relative">
          <div className="text-6xl mb-6">📱👆</div>
          <div className="mt-4 space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Your phone screen isn&apos;t pressing any buttons. It&apos;s just smooth glass.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              Yet it knows exactly where your finger is, and can track 10 fingers at once!
            </p>
            <div className="pt-2">
              <p className="text-base text-cyan-400 font-semibold">
                The secret: your body is a conductor!
              </p>
            </div>
          </div>
        </div>
      </div>
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover the Secret
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2"><span className="text-cyan-400">+</span>Interactive Lab</div>
        <div className="flex items-center gap-2"><span className="text-cyan-400">+</span>Real-World Examples</div>
        <div className="flex items-center gap-2"><span className="text-cyan-400">+</span>Knowledge Test</div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A capacitive touchscreen has a grid of electrodes under the glass.
          What does your finger actually change when you touch the screen?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'It presses a tiny button at that location' },
          { id: 'B', text: 'It changes the local electric field/capacitance' },
          { id: 'C', text: 'It heats the glass and a sensor detects warmth' },
          { id: 'D', text: 'It reflects light back to a camera' }
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
            Correct! Your finger changes the local capacitance in the touch grid!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Capacitive Touch Grid</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderTouchScreen(isFingerMode ? 'finger' : 'glove', touchPoints)}
      </div>
      <div className="flex justify-center gap-4 mb-6">
        <button
          onMouseDown={(e) => { e.preventDefault(); setIsFingerMode(true); setTouchPoints([]); }}
          className={`px-4 py-2 rounded-lg font-bold ${isFingerMode ? 'bg-cyan-600 text-white' : 'bg-slate-600 text-slate-300'}`}
        >
          Bare Finger
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowGrid(!showGrid); }}
          className={`px-4 py-2 rounded-lg font-bold ${showGrid ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'}`}
        >
          {showGrid ? 'Hide' : 'Show'} Grid
        </button>
      </div>
      <div className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 rounded-xl p-4 max-w-2xl w-full mb-6">
        <p className="text-slate-300 text-center">
          Your conductive finger acts as a capacitor plate!
          The screen measures capacitance changes at each grid intersection.
        </p>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl">
        Understand the Physics
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Your Finger Is a Capacitor Plate!</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl space-y-4">
        <div className="p-4 bg-cyan-900/30 rounded-lg border border-cyan-600">
          <h3 className="text-cyan-400 font-bold mb-2">The Capacitive Principle</h3>
          <p className="text-slate-300">
            Your body is conductive (mostly water + ions). When your finger approaches the screen,
            it forms a <span className="text-yellow-400 font-bold">capacitor</span> with the electrode grid.
          </p>
        </div>
        {renderCapacitorDiagram()}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <h4 className="text-blue-400 font-bold mb-2">X-Y Grid</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>Horizontal electrodes (X)</li>
              <li>Vertical electrodes (Y)</li>
              <li>Intersections form sensing points</li>
            </ul>
          </div>
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <h4 className="text-green-400 font-bold mb-2">Detection</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>Controller scans each intersection</li>
              <li>Measures charge/discharge time</li>
              <li>Finger = slower discharge = detected!</li>
            </ul>
          </div>
        </div>
        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300">
            <strong>Multi-Touch:</strong> Each grid intersection is independent!
            10 fingers = 10 different locations with changed capacitance.
          </p>
        </div>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }} className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Why Don&apos;t Gloves Work?
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Glove Problem</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Regular winter gloves don&apos;t work on touchscreens. Why not?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Gloves are too thick to press hard enough' },
          { id: 'B', text: 'Insulating material blocks capacitive coupling' },
          { id: 'C', text: 'Gloves create too much static electricity' },
          { id: 'D', text: 'The screen needs to sense body heat' }
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
            Exactly! Insulating fabric blocks the capacitive coupling between your body and the screen!
          </p>
          <button onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }} className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
            See the Difference
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Finger vs Glove vs Touch Glove</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
        {renderTouchScreen(touchMode, touchPoints)}
        <div className="flex justify-center gap-2 mt-6">
          <button
            onMouseDown={(e) => { e.preventDefault(); setTouchMode('finger'); setTouchPoints([]); }}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${touchMode === 'finger' ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'}`}
          >
            Bare Finger
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); setTouchMode('glove'); setTouchPoints([]); }}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${touchMode === 'glove' ? 'bg-red-600 text-white' : 'bg-slate-600 text-slate-300'}`}
          >
            Regular Glove
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); setTouchMode('capacitiveGlove'); setTouchPoints([]); }}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${touchMode === 'capacitiveGlove' ? 'bg-cyan-600 text-white' : 'bg-slate-600 text-slate-300'}`}
          >
            Touch Glove
          </button>
        </div>
        <div className={`mt-4 p-4 rounded-lg border ${touchMode === 'glove' ? 'bg-red-900/30 border-red-600' : 'bg-green-900/30 border-green-600'}`}>
          <p className={`text-center ${touchMode === 'glove' ? 'text-red-300' : 'text-green-300'}`}>
            {touchMode === 'finger' && <><span className="font-bold">Bare Finger:</span> Conductive! Forms capacitor with screen.</>}
            {touchMode === 'glove' && <><span className="font-bold">Regular Glove:</span> Insulating fabric blocks capacitive coupling.</>}
            {touchMode === 'capacitiveGlove' && <><span className="font-bold">Touch Glove:</span> Conductive threads connect your finger to the tip!</>}
          </p>
        </div>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }} className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Understand the Solution
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Making Gloves Work</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl space-y-4">
        <div className="p-4 bg-red-900/30 rounded-lg border border-red-600">
          <h3 className="text-red-400 font-bold mb-2">The Problem</h3>
          <p className="text-slate-300">
            Wool, cotton, and synthetic fabrics are <span className="text-yellow-400 font-bold">electrical insulators</span>.
            They block the capacitive coupling between your conductive body and the screen electrodes.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <h4 className="text-cyan-400 font-bold mb-2">Touch Gloves</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>Conductive threads (silver, copper)</li>
              <li>Woven into fingertips</li>
              <li>Connect skin to glove surface</li>
            </ul>
          </div>
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <h4 className="text-purple-400 font-bold mb-2">Active Styluses</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>Battery-powered electronics</li>
              <li>Generate their own signal</li>
              <li>Works with any material</li>
            </ul>
          </div>
        </div>
        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300 text-sm">
            <strong>Life Hack:</strong> In emergencies, a small piece of aluminum foil or a sausage (!)
            can conduct enough to trigger a touchscreen.
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
        <button onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl">
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
            className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(-1) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'}`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{calculateScore() >= 3 ? '🎉' : '📚'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/4</h3>
          <p className="text-slate-300 mb-6">{calculateScore() >= 3 ? 'Excellent! You understand capacitive touch!' : 'Keep studying! Review and try again.'}</p>
          {calculateScore() >= 3 ? (
            <button onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }} className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl">
              Claim Your Mastery Badge
            </button>
          ) : (
            <button onMouseDown={(e) => { e.preventDefault(); setShowTestResults(false); setTestAnswers(Array(4).fill(-1)); goToPhase(3); }} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl">
              Review and Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-blue-900/50 via-cyan-900/50 to-teal-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">📱</div>
        <h1 className="text-3xl font-bold text-white mb-4">Capacitive Touch Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You&apos;ve mastered capacitive touch technology!</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">👆</div><p className="text-sm text-slate-300">Touch Detection</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🧤</div><p className="text-sm text-slate-300">Glove Science</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">📐</div><p className="text-sm text-slate-300">X-Y Grid</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">⚡</div><p className="text-sm text-slate-300">Capacitance</p></div>
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Capacitive Touch</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default CapacitiveTouchRenderer;
