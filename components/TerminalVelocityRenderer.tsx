'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

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

interface FallingObject {
  name: string;
  mass: number;
  area: number;
  dragCoeff: number;
  color: string;
  emoji: string;
  terminalV: number;
}

const TerminalVelocityRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
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

  // Animation states for falling objects
  const [objectY, setObjectY] = useState(40);
  const [objectVelocity, setObjectVelocity] = useState(0);
  const [isDropping, setIsDropping] = useState(false);
  const [selectedObject, setSelectedObject] = useState(0);
  const [showVelocityGraph, setShowVelocityGraph] = useState(true);
  const [velocityHistory, setVelocityHistory] = useState<number[]>([]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [reachedTerminal, setReachedTerminal] = useState(false);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  const objects: FallingObject[] = [
    { name: 'Coffee Filter', mass: 0.001, area: 0.02, dragCoeff: 1.2, color: '#f5f5dc', emoji: '☕', terminalV: 0.9 },
    { name: 'Tennis Ball', mass: 0.057, area: 0.0034, dragCoeff: 0.5, color: '#ccff00', emoji: '🎾', terminalV: 20 },
    { name: 'Baseball', mass: 0.145, area: 0.0042, dragCoeff: 0.35, color: '#ffffff', emoji: '⚾', terminalV: 33 },
    { name: 'Bowling Ball', mass: 7.26, area: 0.035, dragCoeff: 0.4, color: '#1a1a2e', emoji: '🎳', terminalV: 77 },
  ];

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
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete, onGameEvent]);

  // Terminal velocity simulation
  useEffect(() => {
    if (!isDropping) return;

    const obj = objects[selectedObject];
    const g = 9.8;
    const rho = 1.2; // air density

    const interval = setInterval(() => {
      setObjectY(prev => {
        const dragForce = 0.5 * rho * objectVelocity * objectVelocity * obj.dragCoeff * obj.area;
        const gravityForce = obj.mass * g;
        const netForce = gravityForce - dragForce;
        const acceleration = netForce / obj.mass;

        const newVelocity = objectVelocity + acceleration * 0.05;
        setObjectVelocity(newVelocity);
        setTimeElapsed(t => t + 0.05);

        // Track velocity history for graph
        setVelocityHistory(h => [...h.slice(-50), newVelocity]);

        // Check if terminal velocity reached (within 5%)
        if (Math.abs(newVelocity - obj.terminalV) < obj.terminalV * 0.05) {
          setReachedTerminal(true);
        }

        // Scale velocity to screen position
        const newY = prev + newVelocity * 0.3;

        if (newY >= 320) {
          setIsDropping(false);
          return 320;
        }

        return newY;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isDropping, selectedObject, objectVelocity, objects]);

  const startDrop = useCallback(() => {
    setObjectY(40);
    setObjectVelocity(0);
    setVelocityHistory([]);
    setTimeElapsed(0);
    setReachedTerminal(false);
    setIsDropping(true);
  }, []);

  const resetDrop = useCallback(() => {
    setIsDropping(false);
    setObjectY(40);
    setObjectVelocity(0);
    setVelocityHistory([]);
    setTimeElapsed(0);
    setReachedTerminal(false);
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
    playSound(prediction === 'C' ? 'success' : 'failure');
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
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);
  }, [testAnswers]);

  const calculateTestScore = useCallback(() => {
    const correctAnswers = [2, 1, 0, 2, 1, 0, 2, 1, 0, 2];
    let score = 0;
    testAnswers.forEach((answer, index) => {
      if (answer === correctAnswers[index]) score++;
    });
    return score;
  }, [testAnswers]);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
  }, [playSound]);

  const renderPhaseContent = () => {
    switch (phase) {
      case 0:
        return (
          <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
            {/* Premium badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-8">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-amber-400 tracking-wide">PHYSICS EXPLORATION</span>
            </div>

            {/* Main title with gradient */}
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-amber-100 to-orange-200 bg-clip-text text-transparent">
              The Speed Limit of Falling
            </h1>

            <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-8 leading-relaxed">
              Why do skydivers stop accelerating, even though gravity never stops pulling?
            </p>

            {/* Premium card with skydiver animation */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-8 max-w-2xl border border-slate-700/50 shadow-2xl shadow-amber-500/5 mb-8">
              <div className="relative w-full h-56 rounded-2xl overflow-hidden mb-6">
                <svg viewBox="0 0 400 220" className="w-full h-full">
                  {/* Sky gradient */}
                  <defs>
                    <linearGradient id="skyGradHook" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#1e90ff" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#0a1628" stopOpacity="0.7" />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width="400" height="220" fill="url(#skyGradHook)" />

                  {/* Clouds */}
                  <ellipse cx="80" cy="40" rx="45" ry="18" fill="white" opacity="0.3" />
                  <ellipse cx="320" cy="55" rx="55" ry="22" fill="white" opacity="0.25" />

                  {/* Airplane at high altitude */}
                  <g transform="translate(100, 60)">
                    <ellipse cx="0" cy="0" rx="30" ry="8" fill="#64748b" />
                    <polygon points="-15,-8 -15,8 -35,15" fill="#475569" />
                    <polygon points="20,-5 20,5 35,8" fill="#475569" />
                    <rect x="-20" y="-3" width="8" height="6" fill="#87ceeb" />
                  </g>

                  {/* Skydiver falling */}
                  <g transform="translate(200, 130)">
                    <ellipse cx="0" cy="0" rx="20" ry="10" fill="#f97316" />
                    <circle cx="0" cy="-15" r="10" fill="#fcd9b6" />
                    <ellipse cx="0" cy="-17" rx="12" ry="8" fill="#1e293b" />
                    <line x1="-20" y1="0" x2="-45" y2="-8" stroke="#f97316" strokeWidth="5" strokeLinecap="round" />
                    <line x1="20" y1="0" x2="45" y2="-8" stroke="#f97316" strokeWidth="5" strokeLinecap="round" />
                    <line x1="-8" y1="10" x2="-20" y2="28" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
                    <line x1="8" y1="10" x2="20" y2="28" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
                  </g>

                  {/* Speed indicator */}
                  <rect x="300" y="100" width="85" height="55" fill="rgba(15,23,42,0.8)" rx="8" stroke="rgba(251,191,36,0.3)" strokeWidth="1" />
                  <text x="342" y="122" fontSize="11" fill="#94a3b8" textAnchor="middle">SPEED</text>
                  <text x="342" y="145" fontSize="18" fill="#f59e0b" textAnchor="middle" fontWeight="bold">
                    120 mph
                    <animate attributeName="fill" values="#f59e0b;#fbbf24;#f59e0b" dur="2s" repeatCount="indefinite" />
                  </text>

                  {/* Question */}
                  <text x="200" y="200" fontSize="13" fill="#fbbf24" textAnchor="middle" fontWeight="600">
                    Why doesn&apos;t the speed keep increasing?
                  </text>
                </svg>
              </div>

              <p className="text-xl text-slate-200 mb-4 leading-relaxed">
                A skydiver jumps from 15,000 feet. After a few seconds, they stop accelerating and fall at a <span className="text-amber-400 font-bold">constant speed</span>.
              </p>

              <p className="text-lg text-amber-300 font-medium">
                This constant speed is called <span className="font-bold">terminal velocity</span>. What causes it?
              </p>
            </div>

            {/* Premium CTA button */}
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
              className="group relative px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Discover the Physics
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>

            {/* Subtle hint text */}
            <p className="mt-6 text-sm text-slate-500">
              Explore the physics of air resistance and falling objects
            </p>
          </div>
        );

      case 1:
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-6">Make Your Prediction</h2>
            <p className="text-lg text-slate-200 mb-6 text-center max-w-lg">
              When a falling object reaches terminal velocity, what is the relationship between <span className="text-red-400 font-bold">gravity</span> and <span className="text-green-400 font-bold">air resistance (drag)</span>?
            </p>
            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'A', text: 'Gravity is greater than drag - still accelerating down' },
                { id: 'B', text: 'Drag is greater than gravity - slowing down' },
                { id: 'C', text: 'Gravity equals drag - forces are balanced' },
                { id: 'D', text: 'Both forces become zero at terminal velocity' }
              ].map(option => (
                <button
                  key={option.id}
                  onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
                  disabled={showPredictionFeedback}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showPredictionFeedback && option.id === 'C'
                      ? 'bg-green-600 text-white'
                      : showPredictionFeedback && selectedPrediction === option.id
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  <span className="font-bold">{option.id}.</span> {option.text}
                </button>
              ))}
            </div>
            {showPredictionFeedback && (
              <div className="bg-slate-800 p-4 rounded-xl mb-4 max-w-md">
                <p className={`font-bold ${selectedPrediction === 'C' ? 'text-green-400' : 'text-amber-400'}`}>
                  {selectedPrediction === 'C' ? 'Correct!' : 'Not quite!'}
                </p>
                <p className="text-slate-300">
                  At terminal velocity, drag force equals gravity! Net force = 0, so acceleration = 0.
                  The object falls at constant speed - no speeding up, no slowing down.
                </p>
                <button
                  onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
                  className="mt-4 px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl"
                >
                  See It In Action
                </button>
              </div>
            )}
          </div>
        );

      case 2:
        const currentObj = objects[selectedObject];

        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-4">Terminal Velocity Simulator</h2>

            <div className="flex gap-4 w-full max-w-2xl">
              {/* Drop simulation */}
              <div className="relative flex-1 h-80 bg-gradient-to-b from-sky-600/20 to-slate-900/40 rounded-xl overflow-hidden">
                <svg viewBox="0 0 200 380" className="w-full h-full">
                  {/* Altitude markers */}
                  {[50, 100, 150, 200, 250, 300].map(y => (
                    <g key={y}>
                      <line x1="5" y1={y} x2="20" y2={y} stroke="#fff" strokeWidth="1" opacity="0.3" />
                      <text x="25" y={y + 4} fontSize="8" fill="#fff" opacity="0.3">
                        {Math.round((320 - y) * 50)}ft
                      </text>
                    </g>
                  ))}

                  {/* Ground */}
                  <rect x="0" y="320" width="200" height="60" fill="#2d5a27" />
                  <line x1="0" y1="320" x2="200" y2="320" stroke="#1a3a15" strokeWidth="2" />

                  {/* Falling object */}
                  <g transform={`translate(100, ${objectY})`}>
                    {selectedObject === 0 ? (
                      // Coffee filter
                      <ellipse cx="0" cy="0" rx="20" ry="8" fill={currentObj.color} stroke="#aaa" strokeWidth="1" />
                    ) : selectedObject === 1 ? (
                      // Tennis ball
                      <>
                        <circle cx="0" cy="0" r="12" fill={currentObj.color} />
                        <path d="M-8 -8 Q0 -2 8 -8" stroke="white" strokeWidth="2" fill="none" />
                        <path d="M-8 8 Q0 2 8 8" stroke="white" strokeWidth="2" fill="none" />
                      </>
                    ) : selectedObject === 2 ? (
                      // Baseball
                      <>
                        <circle cx="0" cy="0" r="12" fill={currentObj.color} />
                        <path d="M-8 -5 Q-3 0 -8 5" stroke="red" strokeWidth="1.5" fill="none" />
                        <path d="M8 -5 Q3 0 8 5" stroke="red" strokeWidth="1.5" fill="none" />
                      </>
                    ) : (
                      // Bowling ball
                      <>
                        <circle cx="0" cy="0" r="15" fill={currentObj.color} />
                        <circle cx="-5" cy="-5" r="2" fill="#333" />
                        <circle cx="3" cy="-6" r="2" fill="#333" />
                        <circle cx="0" cy="0" r="2" fill="#333" />
                      </>
                    )}
                  </g>

                  {/* Force vectors */}
                  {isDropping && objectY < 310 && (
                    <>
                      {/* Gravity arrow (red, down) */}
                      <line x1="100" y1={objectY + 20} x2="100" y2={objectY + 50}
                            stroke="#ff4444" strokeWidth="3" />
                      <polygon points={`100,${objectY + 55} 96,${objectY + 45} 104,${objectY + 45}`} fill="#ff4444" />

                      {/* Drag arrow (green, up) */}
                      {objectVelocity > 0.5 && (
                        <>
                          <line x1="100" y1={objectY - 20} x2="100"
                                y2={objectY - 20 - Math.min(objectVelocity / currentObj.terminalV * 30, 30)}
                                stroke="#44ff44" strokeWidth="3" />
                          <polygon points={`100,${objectY - 25 - Math.min(objectVelocity / currentObj.terminalV * 30, 30)} 96,${objectY - 15 - Math.min(objectVelocity / currentObj.terminalV * 30, 30)} 104,${objectY - 15 - Math.min(objectVelocity / currentObj.terminalV * 30, 30)}`}
                                   fill="#44ff44" />
                        </>
                      )}
                    </>
                  )}

                  {/* Terminal velocity indicator */}
                  {reachedTerminal && (
                    <text x="100" y="30" fontSize="12" fill="#00ff00" textAnchor="middle" fontWeight="bold">
                      TERMINAL VELOCITY!
                    </text>
                  )}
                </svg>
              </div>

              {/* Velocity graph */}
              {showVelocityGraph && (
                <div className="w-48 h-80 bg-slate-800 rounded-xl p-3">
                  <div className="text-sm text-slate-400 mb-2">Velocity vs Time</div>
                  <svg viewBox="0 0 150 280" className="w-full h-full">
                    {/* Axes */}
                    <line x1="30" y1="10" x2="30" y2="250" stroke="#666" strokeWidth="1" />
                    <line x1="30" y1="250" x2="140" y2="250" stroke="#666" strokeWidth="1" />

                    {/* Labels */}
                    <text x="15" y="130" fontSize="8" fill="#888" transform="rotate(-90 15 130)">Speed (m/s)</text>
                    <text x="85" y="270" fontSize="8" fill="#888">Time</text>

                    {/* Terminal velocity line */}
                    <line x1="30" y1={250 - (currentObj.terminalV / 80) * 230}
                          x2="140" y2={250 - (currentObj.terminalV / 80) * 230}
                          stroke="#ff6600" strokeWidth="1" strokeDasharray="4,4" />
                    <text x="145" y={253 - (currentObj.terminalV / 80) * 230} fontSize="8" fill="#ff6600">
                      Vt
                    </text>

                    {/* Velocity curve */}
                    {velocityHistory.length > 1 && (
                      <polyline
                        points={velocityHistory.map((v, i) =>
                          `${30 + (i / 50) * 110},${250 - (v / 80) * 230}`
                        ).join(' ')}
                        fill="none"
                        stroke="#00ff00"
                        strokeWidth="2"
                      />
                    )}
                  </svg>
                </div>
              )}
            </div>

            {/* Object selector */}
            <div className="flex gap-2 mt-4 flex-wrap justify-center">
              {objects.map((obj, index) => (
                <button
                  key={index}
                  onMouseDown={(e) => { e.preventDefault(); setSelectedObject(index); resetDrop(); }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedObject === index
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {obj.emoji} {obj.name}
                </button>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mt-4 w-full max-w-lg">
              <div className="bg-slate-800 p-2 rounded-lg text-center">
                <div className="text-amber-400 text-lg font-bold">{objectVelocity.toFixed(1)}</div>
                <div className="text-slate-400 text-xs">m/s</div>
              </div>
              <div className="bg-slate-800 p-2 rounded-lg text-center">
                <div className="text-orange-400 text-lg font-bold">{currentObj.terminalV}</div>
                <div className="text-slate-400 text-xs">Terminal V</div>
              </div>
              <div className="bg-slate-800 p-2 rounded-lg text-center">
                <div className="text-green-400 text-lg font-bold">{(objectVelocity / currentObj.terminalV * 100).toFixed(0)}%</div>
                <div className="text-slate-400 text-xs">of Terminal</div>
              </div>
              <div className="bg-slate-800 p-2 rounded-lg text-center">
                <div className="text-cyan-400 text-lg font-bold">{timeElapsed.toFixed(1)}s</div>
                <div className="text-slate-400 text-xs">Time</div>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onMouseDown={(e) => { e.preventDefault(); startDrop(); }}
                disabled={isDropping}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-bold rounded-xl transition-all"
              >
                {isDropping ? 'Falling...' : 'Drop!'}
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); resetDrop(); }}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-xl transition-all"
              >
                Reset
              </button>
              <label className="flex items-center gap-2 text-slate-300 text-sm">
                <input
                  type="checkbox"
                  checked={showVelocityGraph}
                  onChange={(e) => setShowVelocityGraph(e.target.checked)}
                />
                Graph
              </label>
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
              className="mt-4 px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl"
            >
              Review the Physics
            </button>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-6">The Physics of Terminal Velocity</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mb-6">
              <div className="bg-slate-800 p-4 rounded-xl">
                <h3 className="text-lg font-bold text-red-400 mb-2">Forces on a Falling Object</h3>
                <div className="flex justify-center items-center gap-4 mb-2">
                  <div className="text-center">
                    <div className="text-2xl">⬇️</div>
                    <div className="text-red-400 text-sm">Gravity</div>
                    <div className="text-slate-400 text-xs">F = mg</div>
                  </div>
                  <div className="text-xl text-slate-500">vs</div>
                  <div className="text-center">
                    <div className="text-2xl">⬆️</div>
                    <div className="text-green-400 text-sm">Drag</div>
                    <div className="text-slate-400 text-xs">F = ½ρv²CdA</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 p-4 rounded-xl">
                <h3 className="text-lg font-bold text-amber-400 mb-2">Terminal Velocity Equation</h3>
                <div className="bg-slate-900 p-3 rounded text-center mb-2">
                  <span className="text-amber-400 font-mono text-lg">Vt = √(2mg / ρCdA)</span>
                </div>
                <p className="text-slate-400 text-xs">
                  When drag = gravity, solve for v!
                </p>
              </div>

              <div className="bg-gradient-to-r from-amber-900/50 to-orange-900/50 p-4 rounded-xl md:col-span-2">
                <h3 className="text-lg font-bold text-orange-400 mb-2">Why Different Objects Have Different Terminal Velocities</h3>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <div className="text-2xl mb-1">☕</div>
                    <div className="text-slate-300">Coffee Filter</div>
                    <div className="text-amber-400 font-bold">~1 m/s</div>
                    <div className="text-slate-500">Light + Large area</div>
                  </div>
                  <div>
                    <div className="text-2xl mb-1">🎾</div>
                    <div className="text-slate-300">Tennis Ball</div>
                    <div className="text-amber-400 font-bold">~20 m/s</div>
                    <div className="text-slate-500">Light + Small</div>
                  </div>
                  <div>
                    <div className="text-2xl mb-1">🧑</div>
                    <div className="text-slate-300">Skydiver</div>
                    <div className="text-amber-400 font-bold">~55 m/s</div>
                    <div className="text-slate-500">Heavy + Large</div>
                  </div>
                  <div>
                    <div className="text-2xl mb-1">🎳</div>
                    <div className="text-slate-300">Bowling Ball</div>
                    <div className="text-amber-400 font-bold">~77 m/s</div>
                    <div className="text-slate-500">Heavy + Small</div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl"
            >
              Ready for the Twist?
            </button>
          </div>
        );

      case 4:
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">The Twist: Cats vs Humans</h2>
            <div className="bg-slate-800 p-4 rounded-xl mb-6 max-w-lg">
              <p className="text-slate-200 text-center mb-4">
                A cat&apos;s terminal velocity is about <span className="text-green-400 font-bold">60 mph</span>.
                A human&apos;s terminal velocity is about <span className="text-red-400 font-bold">120 mph</span>.
              </p>
              <p className="text-xl text-purple-300 text-center font-bold">
                If a cat and human fall from a skyscraper, which is MORE likely to survive?
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'A', text: 'The human - bigger body absorbs impact better' },
                { id: 'B', text: 'The cat - lower terminal velocity means less impact' },
                { id: 'C', text: 'Same chance - height doesn\'t matter after terminal velocity' },
                { id: 'D', text: 'Neither - both reach deadly speeds' }
              ].map(option => (
                <button
                  key={option.id}
                  onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
                  disabled={showTwistFeedback}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showTwistFeedback && option.id === 'B'
                      ? 'bg-green-600 text-white'
                      : showTwistFeedback && twistPrediction === option.id
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  <span className="font-bold">{option.id}.</span> {option.text}
                </button>
              ))}
            </div>
            {showTwistFeedback && (
              <div className="bg-slate-800 p-4 rounded-xl max-w-md">
                <p className={`font-bold ${twistPrediction === 'B' ? 'text-green-400' : 'text-purple-400'}`}>
                  {twistPrediction === 'B' ? 'Exactly right!' : 'Surprising but true!'}
                </p>
                <p className="text-slate-300">
                  Cats have survived falls from 32+ stories! Their low terminal velocity (~60 mph)
                  and ability to spread out like a parachute gives them a fighting chance. They also relax during falls,
                  reducing impact injuries.
                </p>
                <button
                  onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
                  className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl"
                >
                  See the Physics
                </button>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Size vs Terminal Velocity</h2>
            <TwistAnimation />
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
              className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl"
            >
              Understand Why
            </button>
          </div>
        );

      case 6:
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">The Square-Cube Law</h2>

            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-6 rounded-xl max-w-lg mb-6">
              <h3 className="text-lg font-bold text-pink-400 mb-3">Why Smaller Animals Have Lower Terminal Velocity</h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <div className="text-yellow-400 font-bold mb-1">Surface Area</div>
                  <p className="text-slate-300 text-sm">Scales with size²</p>
                  <p className="text-slate-400 text-xs">2× bigger → 4× area</p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <div className="text-red-400 font-bold mb-1">Mass (Volume)</div>
                  <p className="text-slate-300 text-sm">Scales with size³</p>
                  <p className="text-slate-400 text-xs">2× bigger → 8× mass</p>
                </div>
              </div>

              <p className="text-slate-200 text-sm mb-3">
                As animals get smaller, their <span className="text-yellow-400">area-to-mass ratio increases</span>.
                More area relative to weight = more drag relative to gravity = <span className="text-green-400">slower terminal velocity</span>.
              </p>

              <div className="bg-slate-800 p-3 rounded text-xs text-center">
                <p className="text-slate-300">
                  An ant has such high area-to-mass ratio it can&apos;t be hurt by falling at any height!
                </p>
                <p className="text-amber-400 mt-1">
                  &quot;You can drop a mouse down a thousand-yard mine shaft and it will walk away&quot; - J.B.S. Haldane
                </p>
              </div>
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold rounded-xl"
            >
              See Real-World Applications
            </button>
          </div>
        );

      case 7:
        const applications = [
          {
            title: 'Skydiving & BASE Jumping',
            description: 'Skydivers use body position to control terminal velocity (120-200 mph). Wingsuits increase surface area dramatically, reducing terminal velocity to ~60 mph for horizontal flight.',
            color: 'from-orange-600 to-red-600',
            icon: (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <ellipse cx="50" cy="50" rx="30" ry="12" fill="#ff6600" />
                <circle cx="50" cy="35" r="10" fill="#ffcc99" />
                <ellipse cx="50" cy="33" rx="12" ry="8" fill="#333" />
                <path d="M20 50 L5 65" stroke="#ff6600" strokeWidth="6" strokeLinecap="round" />
                <path d="M80 50 L95 65" stroke="#ff6600" strokeWidth="6" strokeLinecap="round" />
                <line x1="40" y1="62" x2="30" y2="85" stroke="#333" strokeWidth="6" strokeLinecap="round" />
                <line x1="60" y1="62" x2="70" y2="85" stroke="#333" strokeWidth="6" strokeLinecap="round" />
                <path d="M10 70 Q50 90 90 70" stroke="#00ff00" strokeWidth="2" strokeDasharray="4,4" fill="none" opacity="0.5">
                  <animate attributeName="stroke-dashoffset" from="0" to="-8" dur="1s" repeatCount="indefinite" />
                </path>
              </svg>
            )
          },
          {
            title: 'Parachute Design',
            description: 'Parachutes dramatically increase surface area, reducing terminal velocity from ~55 m/s to ~5 m/s (safe landing speed). The large canopy creates enough drag to balance gravity.',
            color: 'from-sky-600 to-blue-600',
            icon: (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <ellipse cx="50" cy="25" rx="40" ry="20" fill="#ff4444" />
                <line x1="15" y1="35" x2="40" y2="75" stroke="#333" strokeWidth="1.5" />
                <line x1="85" y1="35" x2="60" y2="75" stroke="#333" strokeWidth="1.5" />
                <line x1="50" y1="45" x2="50" y2="75" stroke="#333" strokeWidth="1.5" />
                <ellipse cx="50" cy="80" rx="8" ry="12" fill="#ff6600" />
                <circle cx="50" cy="68" r="5" fill="#ffcc99" />
                <line x1="42" y1="85" x2="38" y2="95" stroke="#333" strokeWidth="3" strokeLinecap="round" />
                <line x1="58" y1="85" x2="62" y2="95" stroke="#333" strokeWidth="3" strokeLinecap="round" />
              </svg>
            )
          },
          {
            title: 'Hailstone Damage',
            description: 'Hailstones of different sizes fall at different terminal velocities. A golf-ball sized hailstone can reach 100+ mph - fast enough to dent cars and break windows!',
            color: 'from-cyan-600 to-slate-600',
            icon: (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect x="10" y="50" width="80" height="40" fill="#444" />
                <rect x="20" y="60" width="25" height="20" fill="#87ceeb" />
                <rect x="55" y="60" width="25" height="20" fill="#87ceeb" />
                {/* Small hail */}
                <circle cx="25" cy="20" r="4" fill="white">
                  <animate attributeName="cy" values="20;45;20" dur="2s" repeatCount="indefinite" />
                </circle>
                {/* Large hail */}
                <circle cx="65" cy="15" r="10" fill="#e0e0e0">
                  <animate attributeName="cy" values="15;40;15" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="65" cy="15" r="6" fill="#c0c0c0">
                  <animate attributeName="cy" values="15;40;15" dur="1.5s" repeatCount="indefinite" />
                </circle>
                {/* Impact marks */}
                <ellipse cx="45" cy="52" rx="5" ry="2" fill="#555" />
              </svg>
            )
          },
          {
            title: 'Raindrop Physics',
            description: 'Raindrops reach terminal velocity of only 5-10 m/s due to their small size and air resistance. Without air, rain would hit the ground at ~500 m/s and be lethal!',
            color: 'from-blue-600 to-indigo-600',
            icon: (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Clouds */}
                <ellipse cx="50" cy="20" rx="35" ry="15" fill="#888" />
                <ellipse cx="30" cy="25" rx="20" ry="10" fill="#888" />
                <ellipse cx="70" cy="25" rx="20" ry="10" fill="#888" />
                {/* Raindrops */}
                {[20, 35, 50, 65, 80].map((x, i) => (
                  <path key={i} d={`M${x} 45 Q${x - 3} 55 ${x} 65 Q${x + 3} 55 ${x} 45`} fill="#4488ff">
                    <animate attributeName="d"
                             values={`M${x} 45 Q${x - 3} 55 ${x} 65 Q${x + 3} 55 ${x} 45;M${x} 70 Q${x - 3} 80 ${x} 90 Q${x + 3} 80 ${x} 70;M${x} 45 Q${x - 3} 55 ${x} 65 Q${x + 3} 55 ${x} 45`}
                             dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
                  </path>
                ))}
                {/* Puddle */}
                <ellipse cx="50" cy="92" rx="35" ry="5" fill="#4488ff" opacity="0.5" />
              </svg>
            )
          }
        ];

        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-green-400 mb-6">Real-World Applications</h2>

            <div className="flex gap-2 mb-4 flex-wrap justify-center">
              {applications.map((app, index) => (
                <button
                  key={index}
                  onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeAppTab === index
                      ? `bg-gradient-to-r ${app.color} text-white`
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {completedApps.has(index) && '✓ '}{app.title.split(' ')[0]}
                </button>
              ))}
            </div>

            <div className={`bg-gradient-to-r ${applications[activeAppTab].color} p-1 rounded-xl w-full max-w-md`}>
              <div className="bg-slate-900 p-4 rounded-lg">
                <div className="w-24 h-24 mx-auto mb-4">
                  {applications[activeAppTab].icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{applications[activeAppTab].title}</h3>
                <p className="text-slate-300">{applications[activeAppTab].description}</p>
                {!completedApps.has(activeAppTab) && (
                  <button
                    onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
                    className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg"
                  >
                    Mark as Understood
                  </button>
                )}
              </div>
            </div>

            <p className="text-slate-400 mt-4">
              Completed: {completedApps.size} / {applications.length}
            </p>

            {completedApps.size >= 3 && (
              <button
                onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
                className="mt-4 px-8 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl"
              >
                Take the Quiz
              </button>
            )}
          </div>
        );

      case 8:
        const questions = [
          {
            q: 'At terminal velocity, what is the net force on a falling object?',
            options: ['Maximum downward', 'Maximum upward', 'Zero', 'Constantly changing'],
            correct: 2
          },
          {
            q: 'Which factor does NOT affect terminal velocity?',
            options: ['Mass', 'Height of drop', 'Surface area', 'Air density'],
            correct: 1
          },
          {
            q: 'Why does a coffee filter fall slower than a baseball?',
            options: ['High area-to-mass ratio', 'Lower mass', 'Air avoids it', 'Gravity is weaker on it'],
            correct: 0
          },
          {
            q: 'A skydiver reaches terminal velocity and then tucks into a ball. What happens?',
            options: ['Speed stays the same', 'Speed decreases', 'Speed increases to new terminal V', 'Speed becomes zero'],
            correct: 2
          },
          {
            q: 'According to the square-cube law, as animals get smaller...',
            options: ['Terminal velocity increases', 'Terminal velocity decreases', 'Terminal velocity is unchanged', 'They can\'t reach terminal velocity'],
            correct: 1
          },
          {
            q: 'What is the approximate terminal velocity of a skydiver (spread eagle)?',
            options: ['55 m/s (120 mph)', '100 m/s (220 mph)', '20 m/s (45 mph)', '5 m/s (11 mph)'],
            correct: 0
          },
          {
            q: 'How does a parachute reduce terminal velocity?',
            options: ['Reduces mass', 'Reduces gravity', 'Increases drag area dramatically', 'Creates upward thrust'],
            correct: 2
          },
          {
            q: 'Without air resistance, how fast would rain hit the ground?',
            options: ['Same speed (5-10 m/s)', 'About 500 m/s', 'Speed of light', 'It would float'],
            correct: 1
          },
          {
            q: 'Why can an ant survive a fall from any height?',
            options: ['Very low terminal velocity', 'Exoskeleton protection', 'They can fly', 'Time moves slower for them'],
            correct: 0
          },
          {
            q: 'What is the relationship between drag and velocity at terminal velocity?',
            options: ['Drag < Gravity', 'Drag > Gravity', 'Drag = Gravity', 'No relationship'],
            correct: 2
          }
        ];

        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-6">Knowledge Check</h2>

            <div className="w-full max-w-lg space-y-4 max-h-96 overflow-y-auto">
              {questions.map((question, qIndex) => (
                <div key={qIndex} className="bg-slate-800 p-4 rounded-xl">
                  <p className="text-slate-200 mb-3 font-medium">{qIndex + 1}. {question.q}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {question.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                        disabled={showTestResults}
                        className={`p-2 rounded-lg text-sm transition-all ${
                          showTestResults && oIndex === question.correct
                            ? 'bg-green-600 text-white'
                            : showTestResults && testAnswers[qIndex] === oIndex
                            ? 'bg-red-600 text-white'
                            : testAnswers[qIndex] === oIndex
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {!showTestResults && testAnswers.every(a => a !== -1) && (
              <button
                onMouseDown={(e) => { e.preventDefault(); setShowTestResults(true); }}
                className="mt-6 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl"
              >
                Submit Answers
              </button>
            )}

            {showTestResults && (
              <div className="mt-6 text-center">
                <p className="text-2xl font-bold text-amber-400">
                  Score: {calculateTestScore()} / 10
                </p>
                <p className={`text-lg ${calculateTestScore() >= 7 ? 'text-green-400' : 'text-red-400'}`}>
                  {calculateTestScore() >= 7 ? 'Excellent! You\'ve mastered terminal velocity!' : 'Keep practicing! Try the simulation again.'}
                </p>
                {calculateTestScore() >= 7 && (
                  <button
                    onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }}
                    className="mt-4 px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold rounded-xl"
                  >
                    Claim Your Badge!
                  </button>
                )}
              </div>
            )}
          </div>
        );

      case 9:
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
            <div className="text-6xl mb-4">☁️</div>
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mb-4">
              Terminal Velocity Master!
            </h2>
            <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/50 p-6 rounded-xl max-w-md mb-6">
              <p className="text-slate-200 mb-4">
                You&apos;ve mastered the physics of terminal velocity!
              </p>
              <div className="text-left text-sm text-slate-300 space-y-2">
                <p>✓ Terminal velocity = when drag equals gravity</p>
                <p>✓ Different objects have different terminal velocities</p>
                <p>✓ Square-cube law explains why small animals survive falls</p>
                <p>✓ Parachutes dramatically increase drag area</p>
              </div>
            </div>
            <p className="text-amber-400 font-medium">
              Now you understand why skydivers stop accelerating!
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const TwistAnimation: React.FC = () => {
    const [catY, setCatY] = useState(30);
    const [humanY, setHumanY] = useState(30);
    const [antY, setAntY] = useState(30);
    const [isDropping, setIsDropping] = useState(false);

    const startDrop = useCallback(() => {
      if (isDropping) return;
      setIsDropping(true);
      setCatY(30);
      setHumanY(30);
      setAntY(30);

      let catV = 0;
      let humanV = 0;
      let antV = 0;

      const interval = setInterval(() => {
        // Ant: very low terminal V (~0.5 m/s scaled)
        antV = Math.min(antV + 0.5, 2);
        // Cat: medium terminal V (~27 m/s scaled)
        catV = Math.min(catV + 1, 8);
        // Human: high terminal V (~55 m/s scaled)
        humanV = Math.min(humanV + 1.5, 15);

        setAntY(prev => Math.min(prev + antV, 240));
        setCatY(prev => Math.min(prev + catV, 240));
        setHumanY(prev => Math.min(prev + humanV, 240));

        if (humanY >= 240 && catY >= 240 && antY >= 240) {
          clearInterval(interval);
          setIsDropping(false);
        }
      }, 50);

      setTimeout(() => {
        clearInterval(interval);
        setIsDropping(false);
      }, 5000);
    }, [isDropping, humanY, catY, antY]);

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-full max-w-lg h-64 bg-gradient-to-b from-sky-400/20 to-green-800/30 rounded-xl overflow-hidden">
          <svg viewBox="0 0 400 280" className="w-full h-full">
            {/* Sky */}
            <rect x="0" y="0" width="400" height="240" fill="#87ceeb" opacity="0.2" />

            {/* Ground */}
            <rect x="0" y="240" width="400" height="40" fill="#2d5a27" />

            {/* Labels */}
            <text x="80" y="20" fontSize="12" fill="#aaa" textAnchor="middle">Ant</text>
            <text x="200" y="20" fontSize="12" fill="#aaa" textAnchor="middle">Cat</text>
            <text x="320" y="20" fontSize="12" fill="#aaa" textAnchor="middle">Human</text>

            {/* Ant */}
            <circle cx="80" cy={antY} r="3" fill="#333" />

            {/* Cat */}
            <g transform={`translate(200, ${catY})`}>
              <ellipse cx="0" cy="0" rx="15" ry="8" fill="#ff9933" />
              <circle cx="-12" cy="-5" r="6" fill="#ff9933" />
              <circle cx="-14" cy="-8" r="2" fill="#ffcc99" />
              <circle cx="-10" cy="-8" r="2" fill="#ffcc99" />
            </g>

            {/* Human */}
            <g transform={`translate(320, ${humanY})`}>
              <ellipse cx="0" cy="0" rx="15" ry="8" fill="#ff6600" />
              <circle cx="0" cy="-12" r="8" fill="#ffcc99" />
            </g>

            {/* Terminal velocity labels */}
            <text x="80" y="265" fontSize="10" fill="#666" textAnchor="middle">~0.5 m/s</text>
            <text x="200" y="265" fontSize="10" fill="#666" textAnchor="middle">~27 m/s</text>
            <text x="320" y="265" fontSize="10" fill="#666" textAnchor="middle">~55 m/s</text>
          </svg>
        </div>

        <button
          onMouseDown={(e) => { e.preventDefault(); startDrop(); }}
          disabled={isDropping}
          className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white font-bold rounded-xl"
        >
          {isDropping ? 'Falling...' : 'Drop All Three!'}
        </button>

        <p className="text-slate-400 text-sm mt-2">
          Watch how size affects terminal velocity and survival!
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-600/3 rounded-full blur-3xl" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-amber-400">Terminal Velocity</span>
          <div className="flex gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p ? 'bg-amber-500 w-6' : phase > p ? 'bg-emerald-500 w-2' : 'bg-slate-600 w-2'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm text-slate-400 font-medium">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 pt-16 pb-8">
        {renderPhaseContent()}
      </div>
    </div>
  );
};

export default TerminalVelocityRenderer;
