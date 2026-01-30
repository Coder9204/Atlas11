'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ===============================================================================
// TYPES & INTERFACES
// ===============================================================================
interface CapacitiveTouchRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

interface TouchPoint {
  x: number;
  y: number;
  capacitance: number;
}

// ===============================================================================
// CONSTANTS
// ===============================================================================
const TEST_QUESTIONS = [
  {
    question: 'What does your finger change when touching a capacitive screen?',
    options: [
      { text: 'The screen temperature', correct: false },
      { text: 'The local capacitance in the touch grid', correct: true },
      { text: 'The screen brightness', correct: false },
      { text: 'The electrical resistance', correct: false }
    ]
  },
  {
    question: 'Why don\'t regular gloves work on touchscreens?',
    options: [
      { text: 'They\'re too thick to press hard enough', correct: false },
      { text: 'They block the capacitive coupling with your body', correct: true },
      { text: 'They create static electricity', correct: false },
      { text: 'The screen can\'t sense warmth through them', correct: false }
    ]
  },
  {
    question: 'How does the screen know WHERE you touched?',
    options: [
      { text: 'A camera watches your finger', correct: false },
      { text: 'Pressure sensors under the glass', correct: false },
      { text: 'Grid of electrodes detects which intersection changed', correct: true },
      { text: 'Sound waves bounce off your finger', correct: false }
    ]
  },
  {
    question: 'Why can capacitive screens detect multiple touches?',
    options: [
      { text: 'Multiple pressure sensors', correct: false },
      { text: 'Each touch point changes capacitance at a different grid location', correct: true },
      { text: 'The screen has multiple layers', correct: false },
      { text: 'The CPU is very fast', correct: false }
    ]
  },
  {
    question: 'What is the difference between mutual capacitance and self-capacitance touchscreens?',
    options: [
      { text: 'Mutual capacitance measures between X-Y electrode pairs; self-capacitance measures each electrode individually', correct: true },
      { text: 'Self-capacitance is newer and always better', correct: false },
      { text: 'Mutual capacitance only works with styluses', correct: false },
      { text: 'There is no difference, they are the same technology', correct: false }
    ]
  },
  {
    question: 'Why do capacitive styluses need a conductive tip or active electronics?',
    options: [
      { text: 'To make the stylus heavier for better control', correct: false },
      { text: 'To create the same capacitive coupling effect as a finger', correct: true },
      { text: 'To generate heat that the screen detects', correct: false },
      { text: 'To produce clicking sounds for feedback', correct: false }
    ]
  },
  {
    question: 'What property of the human body makes capacitive touchscreens work?',
    options: [
      { text: 'Body temperature', correct: false },
      { text: 'Skin texture and fingerprints', correct: false },
      { text: 'The body is electrically conductive (contains water and ions)', correct: true },
      { text: 'Magnetic fields from blood flow', correct: false }
    ]
  },
  {
    question: 'When you touch a capacitive screen, what physically happens to the electric field?',
    options: [
      { text: 'The field is completely blocked', correct: false },
      { text: 'The field lines are distorted and some terminate on your finger', correct: true },
      { text: 'The field reverses direction', correct: false },
      { text: 'Nothing happens to the field, only pressure matters', correct: false }
    ]
  },
  {
    question: 'Why do capacitive touchscreens work through thin glass but not thick glass?',
    options: [
      { text: 'Thin glass is more conductive', correct: false },
      { text: 'The capacitive coupling weakens with distance; thick glass puts finger too far from electrodes', correct: true },
      { text: 'Thick glass absorbs all the electricity', correct: false },
      { text: 'The screen cannot see through thick glass', correct: false }
    ]
  },
  {
    question: 'What advantage does projected capacitive touch (PCT) have over older resistive touchscreens?',
    options: [
      { text: 'PCT is cheaper to manufacture', correct: false },
      { text: 'PCT supports multi-touch, is more durable, and works without pressure', correct: true },
      { text: 'Resistive screens cannot detect any touch', correct: false },
      { text: 'PCT screens are always smaller', correct: false }
    ]
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

// ===============================================================================
// MAIN COMPONENT
// ===============================================================================
const CapacitiveTouchRenderer: React.FC<CapacitiveTouchRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}) => {
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(TEST_QUESTIONS.length).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Simulation state
  const [touchPoints, setTouchPoints] = useState<TouchPoint[]>([]);
  const [isFingerMode, setIsFingerMode] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [touchMode, setTouchMode] = useState<'finger' | 'glove' | 'capacitiveGlove'>('finger');

  // Interactive slider states for play phase
  const [fingerDistance, setFingerDistance] = useState(5); // 0 to 10mm
  const [dielectricConstant, setDielectricConstant] = useState(3.9); // Glass ~3.9, Air ~1
  const [electrodeSpacing, setElectrodeSpacing] = useState(2); // 1 to 5mm
  const [touchThreshold] = useState(0.5); // Detection threshold (normalized)

  // Multi-touch simulation states for twist_play phase
  const [multiTouchPoints, setMultiTouchPoints] = useState<{x: number; y: number; id: number}[]>([]);
  const [gestureMode, setGestureMode] = useState<'single' | 'pinch' | 'spread' | 'rotate'>('single');
  const [pinchScale, setPinchScale] = useState(1);
  const [rotationAngle, setRotationAngle] = useState(0);

  const lastClickRef = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);

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
    if (phase === 'play') {
      setTouchPoints([]);
      setIsFingerMode(true);
      setShowGrid(true);
    }
    if (phase === 'twist_play') {
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

  const submitTest = () => {
    let score = 0;
    TEST_QUESTIONS.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setShowTestResults(true);
    if (score >= 3 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

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

  const colors = {
    textPrimary: '#f8fafc',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    bgPrimary: '#0f172a',
    bgCard: 'rgba(30, 41, 59, 0.9)',
    bgDark: 'rgba(15, 23, 42, 0.95)',
    accent: '#06b6d4',
    accentGlow: 'rgba(6, 182, 212, 0.4)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  };

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000,
    }}>
      <button
        onClick={onPhaseComplete}
        disabled={disabled && !canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
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
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
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
              </div>
            )}
          </div>
        </div>
        {renderBottomBar(true, !!selectedPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // Calculate capacitance based on C = εA/d formula
  const calculateCapacitance = (distance: number, dielectric: number, spacing: number) => {
    // Normalize values for visualization
    const baseArea = 1 / spacing; // Smaller spacing = larger effective area
    const capacitance = (dielectric * baseArea) / Math.max(distance, 0.1);
    return Math.min(capacitance, 10); // Cap at 10 for visualization
  };

  const currentCapacitance = calculateCapacitance(fingerDistance, dielectricConstant, electrodeSpacing);
  const isDetected = currentCapacitance > touchThreshold * 10;

  // Render interactive capacitance visualization SVG
  const renderCapacitanceVisualization = () => {
    const normalizedCapacitance = Math.min(currentCapacitance / 10, 1);
    const fingerY = 30 + (fingerDistance / 10) * 80; // Finger position based on distance
    const fieldIntensity = isDetected ? normalizedCapacitance : 0.1;

    return (
      <svg viewBox="0 0 400 200" className="w-full h-48">
        <defs>
          <linearGradient id="electrodeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="fieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={fieldIntensity} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={fieldIntensity * 0.3} />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="400" height="200" fill="#111827" rx="8" />

        {/* Glass layer */}
        <rect x="50" y="130" width="300" height="20" fill="rgba(147, 197, 253, 0.3)" stroke="#93c5fd" strokeWidth="1" />
        <text x="200" y="145" textAnchor="middle" className="fill-blue-300 text-xs">Glass (ε = {dielectricConstant.toFixed(1)})</text>

        {/* Electrode grid */}
        <rect x="50" y="150" width="300" height="10" fill="url(#electrodeGrad)" />
        <text x="200" y="175" textAnchor="middle" className="fill-blue-400 text-xs">Electrode Grid (spacing: {electrodeSpacing}mm)</text>

        {/* Electric field lines - dynamic based on distance */}
        {isDetected && [...Array(7)].map((_, i) => {
          const startX = 120 + i * 25;
          const endX = startX + (Math.random() - 0.5) * 10;
          return (
            <g key={i}>
              <path
                d={`M ${startX} 130 Q ${(startX + endX) / 2} ${(fingerY + 130) / 2} ${endX} ${fingerY + 20}`}
                fill="none"
                stroke="#22c55e"
                strokeWidth={2 * fieldIntensity}
                strokeDasharray="4,2"
                opacity={fieldIntensity}
                className="animate-pulse"
              />
              {/* Field arrows */}
              <circle cx={endX} cy={fingerY + 20} r={3 * fieldIntensity} fill="#22c55e" opacity={fieldIntensity} />
            </g>
          );
        })}

        {/* Finger representation */}
        <ellipse
          cx="200"
          cy={fingerY}
          rx="30"
          ry="20"
          fill="#fca5a5"
          stroke={isDetected ? "#22c55e" : "#ef4444"}
          strokeWidth="3"
        />
        <text x="200" y={fingerY + 5} textAnchor="middle" className="fill-gray-800 text-xs font-bold">Finger</text>

        {/* Distance indicator */}
        <line x1="240" y1={fingerY + 20} x2="240" y2="130" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4,4" />
        <text x="260" y={(fingerY + 130) / 2 + 10} className="fill-yellow-400 text-xs">{fingerDistance}mm</text>

        {/* Capacitance meter */}
        <rect x="320" y="20" width="60" height="100" rx="4" fill="#1f2937" stroke="#4b5563" />
        <text x="350" y="35" textAnchor="middle" className="fill-gray-400 text-xs">C</text>
        <rect
          x="330"
          y={110 - normalizedCapacitance * 70}
          width="40"
          height={normalizedCapacitance * 70}
          fill={isDetected ? "#22c55e" : "#4b5563"}
          rx="2"
        />
        {/* Threshold line */}
        <line x1="325" y1={110 - touchThreshold * 70} x2="375" y2={110 - touchThreshold * 70} stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,3" />
        <text x="350" y={105 - touchThreshold * 70} textAnchor="middle" className="fill-amber-400 text-xs">Threshold</text>

        {/* Detection status */}
        <rect
          x="320"
          y="125"
          width="60"
          height="20"
          rx="4"
          fill={isDetected ? "#22c55e" : "#ef4444"}
        />
        <text x="350" y="139" textAnchor="middle" className="fill-white text-xs font-bold">
          {isDetected ? "DETECTED" : "NO SIGNAL"}
        </text>

        {/* Formula display */}
        <text x="50" y="20" className="fill-cyan-400 text-xs font-mono">C = εA/d</text>
        <text x="50" y="35" className="fill-gray-400 text-xs">Capacitance: {currentCapacitance.toFixed(2)} (norm)</text>
      </svg>
    );
  };

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Capacitive Touch Simulator</h2>

            {/* Interactive Visualization */}
            <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-2xl">
              {renderCapacitanceVisualization()}
            </div>

            {/* Range Sliders */}
            <div className="bg-slate-800/50 rounded-2xl p-6 mb-4 w-full max-w-2xl space-y-6">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">Adjust Parameters</h3>

              {/* Finger Distance Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-medium">Finger Distance from Screen</label>
                  <span className="text-cyan-400 font-mono">{fingerDistance.toFixed(1)} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={fingerDistance}
                  onChange={(e) => setFingerDistance(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  style={{ zIndex: 10 }}
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>0mm (touching)</span>
                  <span>10mm (far)</span>
                </div>
              </div>

              {/* Dielectric Constant Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-medium">Dielectric Constant (ε)</label>
                  <span className="text-cyan-400 font-mono">ε = {dielectricConstant.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.1"
                  value={dielectricConstant}
                  onChange={(e) => setDielectricConstant(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                  style={{ zIndex: 10 }}
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>1.0 (Air)</span>
                  <span>3.9 (Glass)</span>
                  <span>10.0 (High-k)</span>
                </div>
              </div>

              {/* Electrode Spacing Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-medium">Electrode Spacing</label>
                  <span className="text-cyan-400 font-mono">{electrodeSpacing.toFixed(1)} mm</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={electrodeSpacing}
                  onChange={(e) => setElectrodeSpacing(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  style={{ zIndex: 10 }}
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>1mm (dense)</span>
                  <span>5mm (sparse)</span>
                </div>
              </div>
            </div>

            {/* Touch Grid Demo */}
            <div className="bg-slate-800/50 rounded-2xl p-6 mb-4 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">Touch Grid Demo</h3>
              {renderTouchScreen(isFingerMode ? 'finger' : 'glove', touchPoints)}
            </div>

            {/* Control Buttons */}
            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={() => { setIsFingerMode(true); setTouchPoints([]); }}
                style={{ zIndex: 10 }}
                className={`px-4 py-2 rounded-lg font-bold ${isFingerMode ? 'bg-cyan-600 text-white' : 'bg-slate-600 text-slate-300'}`}
              >
                Bare Finger
              </button>
              <button
                onClick={() => setShowGrid(!showGrid)}
                style={{ zIndex: 10 }}
                className={`px-4 py-2 rounded-lg font-bold ${showGrid ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'}`}
              >
                {showGrid ? 'Hide' : 'Show'} Grid
              </button>
              <button
                onClick={() => { setFingerDistance(5); setDielectricConstant(3.9); setElectrodeSpacing(2); }}
                style={{ zIndex: 10 }}
                className="px-4 py-2 rounded-lg font-bold bg-amber-600 text-white"
              >
                Reset Values
              </button>
            </div>

            {/* Physics Explanation */}
            <div className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 rounded-xl p-4 max-w-2xl w-full mb-6">
              <p className="text-slate-300 text-center">
                <span className="text-cyan-400 font-bold">C = εA/d</span> - Capacitance increases when:
                dielectric constant (ε) increases, electrode area (A) increases, or distance (d) decreases.
                {isDetected ?
                  <span className="text-green-400 block mt-2">Touch detected! Capacitance exceeds threshold.</span> :
                  <span className="text-red-400 block mt-2">Move finger closer to trigger detection.</span>
                }
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
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
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // Handle adding/removing multi-touch points in grid
  const handleGridClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (gestureMode !== 'single') return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 400;
    const y = ((e.clientY - rect.top) / rect.height) * 280;

    setMultiTouchPoints(prev => {
      if (prev.length >= 5) {
        return [...prev.slice(1), { x, y, id: Date.now() }];
      }
      return [...prev, { x, y, id: Date.now() }];
    });
  };

  // Render multi-touch capacitance grid visualization
  const renderMultiTouchGrid = () => {
    const gridSize = 8;
    const cellWidth = 400 / gridSize;
    const cellHeight = 280 / gridSize;

    // Generate multi-touch points based on gesture mode
    const getGesturePoints = () => {
      const centerX = 200;
      const centerY = 140;
      const baseDistance = 60 * pinchScale;

      switch (gestureMode) {
        case 'pinch':
          return [
            { x: centerX - baseDistance, y: centerY, id: 1 },
            { x: centerX + baseDistance, y: centerY, id: 2 }
          ];
        case 'spread':
          return [
            { x: centerX - baseDistance * 1.5, y: centerY - baseDistance * 0.5, id: 1 },
            { x: centerX + baseDistance * 1.5, y: centerY + baseDistance * 0.5, id: 2 }
          ];
        case 'rotate':
          const angle1 = rotationAngle * Math.PI / 180;
          const angle2 = angle1 + Math.PI;
          return [
            { x: centerX + Math.cos(angle1) * 70, y: centerY + Math.sin(angle1) * 70, id: 1 },
            { x: centerX + Math.cos(angle2) * 70, y: centerY + Math.sin(angle2) * 70, id: 2 }
          ];
        default:
          return multiTouchPoints.length > 0 ? multiTouchPoints : [{ x: centerX, y: centerY, id: 1 }];
      }
    };

    const activePoints = gestureMode === 'single' ? (multiTouchPoints.length > 0 ? multiTouchPoints : []) : getGesturePoints();

    // Calculate capacitance grid values based on touch points
    const getGridCapacitance = (gridX: number, gridY: number) => {
      let totalCapacitance = 0;
      activePoints.forEach(point => {
        const dist = Math.sqrt(
          Math.pow((gridX * cellWidth) - point.x, 2) +
          Math.pow((gridY * cellHeight) - point.y, 2)
        );
        // Capacitance falls off with distance
        const contribution = Math.max(0, 1 - dist / 80);
        totalCapacitance += contribution;
      });
      return Math.min(totalCapacitance, 1);
    };

    return (
      <svg
        viewBox="0 0 400 280"
        className="w-full h-64 cursor-pointer touch-none"
        onClick={handleGridClick}
        style={{ zIndex: 10 }}
      >
        <rect width="400" height="280" fill="#1a1a2e" rx="8" />

        {/* Capacitance Grid Visualization */}
        {[...Array(gridSize)].map((_, i) =>
          [...Array(gridSize)].map((_, j) => {
            const capacitance = getGridCapacitance(i + 0.5, j + 0.5);
            return (
              <rect
                key={`cell-${i}-${j}`}
                x={i * cellWidth + 2}
                y={j * cellHeight + 2}
                width={cellWidth - 4}
                height={cellHeight - 4}
                fill={`rgba(59, 130, 246, ${capacitance * 0.8})`}
                stroke={capacitance > 0.3 ? "#22c55e" : "#4b5563"}
                strokeWidth={capacitance > 0.3 ? 2 : 1}
                rx="2"
              />
            );
          })
        )}

        {/* Grid lines */}
        {[...Array(gridSize + 1)].map((_, i) => (
          <g key={`lines-${i}`}>
            <line x1="0" y1={i * cellHeight} x2="400" y2={i * cellHeight} stroke="#3b82f6" strokeWidth="1" opacity="0.3" />
            <line x1={i * cellWidth} y1="0" x2={i * cellWidth} y2="280" stroke="#22c55e" strokeWidth="1" opacity="0.3" />
          </g>
        ))}

        {/* Touch points */}
        {activePoints.map((point, idx) => (
          <g key={`touch-${point.id}`}>
            {/* Finger ripple effect */}
            <circle
              cx={point.x}
              cy={point.y}
              r="35"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              opacity="0.3"
              className="animate-ping"
            />
            {/* Electric field lines */}
            {[...Array(8)].map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              return (
                <line
                  key={`field-${idx}-${i}`}
                  x1={point.x}
                  y1={point.y}
                  x2={point.x + Math.cos(angle) * 40}
                  y2={point.y + Math.sin(angle) * 40}
                  stroke="#22c55e"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  opacity="0.5"
                />
              );
            })}
            {/* Finger circle */}
            <circle
              cx={point.x}
              cy={point.y}
              r="25"
              fill="rgba(252, 165, 165, 0.8)"
              stroke="#22c55e"
              strokeWidth="3"
            />
            <text x={point.x} y={point.y + 5} textAnchor="middle" className="fill-gray-800 text-xs font-bold">
              {idx + 1}
            </text>
          </g>
        ))}

        {/* Gesture indicator */}
        {gestureMode === 'pinch' && activePoints.length >= 2 && (
          <g>
            <line
              x1={activePoints[0].x}
              y1={activePoints[0].y}
              x2={activePoints[1].x}
              y2={activePoints[1].y}
              stroke="#fbbf24"
              strokeWidth="2"
              strokeDasharray="6,3"
            />
            <text x="200" y="30" textAnchor="middle" className="fill-amber-400 text-sm font-bold">
              Pinch Gesture - Distance: {Math.round(pinchScale * 100)}%
            </text>
          </g>
        )}

        {gestureMode === 'spread' && activePoints.length >= 2 && (
          <text x="200" y="30" textAnchor="middle" className="fill-green-400 text-sm font-bold">
            Spread Gesture - Zoom In
          </text>
        )}

        {gestureMode === 'rotate' && activePoints.length >= 2 && (
          <g>
            <text x="200" y="30" textAnchor="middle" className="fill-purple-400 text-sm font-bold">
              Rotate Gesture - Angle: {rotationAngle}deg
            </text>
            {/* Rotation arc indicator */}
            <path
              d={`M 200 140 m -50 0 a 50 50 0 0 1 ${50 + 50 * Math.cos(rotationAngle * Math.PI / 180)} ${-50 * Math.sin(rotationAngle * Math.PI / 180)}`}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              strokeDasharray="4,2"
            />
          </g>
        )}

        {/* Status display */}
        <rect x="10" y="250" width="120" height="25" rx="4" fill="#1f2937" opacity="0.9" />
        <text x="70" y="267" textAnchor="middle" className="fill-cyan-400 text-xs font-bold">
          Touch Points: {activePoints.length}
        </text>

        {activePoints.length === 0 && (
          <text x="200" y="140" textAnchor="middle" className="fill-gray-500 text-sm">
            Select a gesture or tap to add points
          </text>
        )}
      </svg>
    );
  };

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
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
              </div>
            )}
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-4">Multi-Touch & Gesture Recognition</h2>

            {/* Multi-Touch Grid Visualization */}
            <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">Capacitance Grid Heatmap</h3>
              {renderMultiTouchGrid()}
            </div>

            {/* Gesture Mode Selection */}
            <div className="bg-slate-800/50 rounded-2xl p-6 mb-4 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">Gesture Simulation</h3>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                <button
                  onClick={() => { setGestureMode('single'); setMultiTouchPoints([]); }}
                  style={{ zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${gestureMode === 'single' ? 'bg-cyan-600 text-white' : 'bg-slate-600 text-slate-300'}`}
                >
                  Single Touch
                </button>
                <button
                  onClick={() => { setGestureMode('pinch'); setPinchScale(1); }}
                  style={{ zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${gestureMode === 'pinch' ? 'bg-amber-600 text-white' : 'bg-slate-600 text-slate-300'}`}
                >
                  Pinch (Zoom Out)
                </button>
                <button
                  onClick={() => { setGestureMode('spread'); setPinchScale(1.5); }}
                  style={{ zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${gestureMode === 'spread' ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'}`}
                >
                  Spread (Zoom In)
                </button>
                <button
                  onClick={() => { setGestureMode('rotate'); setRotationAngle(0); }}
                  style={{ zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${gestureMode === 'rotate' ? 'bg-purple-600 text-white' : 'bg-slate-600 text-slate-300'}`}
                >
                  Rotate
                </button>
              </div>

              {/* Gesture-specific sliders */}
              {gestureMode === 'pinch' && (
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-300 font-medium">Pinch Distance</label>
                    <span className="text-amber-400 font-mono">{Math.round(pinchScale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="2"
                    step="0.05"
                    value={pinchScale}
                    onChange={(e) => setPinchScale(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    style={{ zIndex: 10 }}
                  />
                  <p className="text-xs text-slate-500 text-center">Move slider to simulate pinch-to-zoom gesture</p>
                </div>
              )}

              {gestureMode === 'rotate' && (
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-300 font-medium">Rotation Angle</label>
                    <span className="text-purple-400 font-mono">{rotationAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={rotationAngle}
                    onChange={(e) => setRotationAngle(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    style={{ zIndex: 10 }}
                  />
                  <p className="text-xs text-slate-500 text-center">Rotate two fingers to change image orientation</p>
                </div>
              )}

              {gestureMode === 'single' && (
                <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-slate-300 text-sm text-center">
                    Click on the grid above to add touch points (up to 5). Each point affects nearby capacitance cells.
                  </p>
                  {multiTouchPoints.length > 0 && (
                    <button
                      onClick={() => setMultiTouchPoints([])}
                      style={{ zIndex: 10 }}
                      className="mt-2 w-full py-2 bg-red-600 text-white rounded-lg font-medium"
                    >
                      Clear All Points
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Original Touch Mode Demo */}
            <div className="bg-slate-800/50 rounded-2xl p-6 mb-4 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-amber-400 mb-4">Finger vs Glove Comparison</h3>
              {renderTouchScreen(touchMode, touchPoints)}
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => { setTouchMode('finger'); setTouchPoints([]); }}
                  style={{ zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${touchMode === 'finger' ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'}`}
                >
                  Bare Finger
                </button>
                <button
                  onClick={() => { setTouchMode('glove'); setTouchPoints([]); }}
                  style={{ zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-bold text-sm ${touchMode === 'glove' ? 'bg-red-600 text-white' : 'bg-slate-600 text-slate-300'}`}
                >
                  Regular Glove
                </button>
                <button
                  onClick={() => { setTouchMode('capacitiveGlove'); setTouchPoints([]); }}
                  style={{ zIndex: 10 }}
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

            {/* How Multi-Touch Works Explanation */}
            <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 rounded-xl p-4 max-w-2xl w-full mb-6">
              <h4 className="text-amber-400 font-bold mb-2">How Multi-Touch Works</h4>
              <p className="text-slate-300 text-sm">
                Projected Capacitive Touch (PCT) screens use a grid of X-Y electrodes. When multiple fingers touch,
                each creates a capacitance change at different grid intersections. The controller scans all intersections
                rapidly to track each touch point independently, enabling gestures like pinch-to-zoom and rotate.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
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
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
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
          </div>
        </div>
        {renderBottomBar(completedApps.size < 4, completedApps.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (showTestResults) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mx-auto mt-8 text-center">
              <div className="text-6xl mb-4">{testScore >= 3 ? '🎉' : '📚'}</div>
              <h3 className="text-2xl font-bold text-white mb-2">Score: {testScore}/{TEST_QUESTIONS.length}</h3>
              <p className="text-slate-300 mb-6">{testScore >= 3 ? 'Excellent! You understand capacitive touch!' : 'Keep studying! Review and try again.'}</p>
            </div>
            {TEST_QUESTIONS.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4 max-w-2xl mx-auto mt-4" style={{ borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className={`p-2 rounded mb-1 ${opt.correct ? 'bg-emerald-900/30 text-emerald-400' : userAnswer === oIndex ? 'bg-red-900/30 text-red-400' : 'text-slate-400'}`}>
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 3, testScore >= 3 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>
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
                        {option.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onMouseDown={(e) => { e.preventDefault(); submitTest(); }}
                disabled={testAnswers.includes(null)}
                className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(null) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'}`}
              >
                Submit Answers
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
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
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default CapacitiveTouchRenderer;
